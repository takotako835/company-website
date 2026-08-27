import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import { fetchEvents, readAnalyticsConfig, sbFetch } from '../../lib/analytics/db';
import { buildDashboard, judgeAbWinner, type EventRow } from '../../lib/analytics/stats';
import { readMailConfig, sendMail } from '../../lib/mail';

// 週次の自動分析。GitHub Actions の cron から秘密ヘッダー付きで呼ばれる。
// やること: ①先週/先々週の集計 ②A/B勝者の統計判定と自動採用 ③AI分析レポート生成
// ④レポート保存+メール送付 ⑤90日より古い明細の削除

// 分析AIに渡す、このサイトの規範(docs/01・04・brief の要点。この外の提案はさせない)
const BRAND_RULES = `
- ブランド: 温かい・横の関係(先生面をしない)/誠実・売り込まない/行動重視。煽り・不安訴求・誇張は禁止
- プログラム料金はサイトに掲載しない(個別相談の60分・3,000円のみ例外)
- 実在しない実績・数値の創作は絶対禁止。使える実績は「受講生30名以上(2026年7月時点)」「満足度100%(注記必須)」「企業研修導入実績あり」のみ
- 文体: です・ます調。1文50字以内目安。「!」は使わない。最上級表現(No.1等)は使わない
- 最重要CVはLINE個別相談。次いで法人フォーム送信`;

const timezoneDay = (offsetDays: number): string =>
  new Date(Date.now() - offsetDays * 86400000).toISOString().slice(0, 10);

export const POST: APIRoute = async ({ request }) => {
  const secret = process.env.ANALYZE_SECRET?.trim();
  if (!secret || request.headers.get('x-analyze-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  const config = readAnalyticsConfig();
  if (!config) {
    return new Response(JSON.stringify({ error: 'supabase not configured' }), { status: 503 });
  }

  // 直近14日分を取得し、今週(直近7日)と前週に分けて比較する
  const events = (await fetchEvents(
    config,
    new Date(Date.now() - 14 * 86400000).toISOString(),
  )) as unknown as EventRow[];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const thisWeek = buildDashboard(events.filter((e) => e.ts >= weekAgo));
  const prevWeek = buildDashboard(events.filter((e) => e.ts < weekAgo));

  // A/B: 14日分のデータで統計判定し、勝者が出たら自動採用する
  const abAll = buildDashboard(events).ab;
  const winner = judgeAbWinner(abAll);
  let abAction = 'テスト継続(判定に足るデータ待ち)';
  if (winner) {
    const patched = await sbFetch(config, 'ab_config?key=eq.hero_value_prop&status=eq.running', {
      method: 'PATCH',
      body: { status: 'done', winner, updated_at: new Date().toISOString() },
    });
    abAction = patched.ok
      ? `勝者「${winner}案」を確定し、全訪問者への配信に切り替えました`
      : 'テスト継続';
  }

  // 90日より古い明細を削除(集計済みの数値はレポートに残る)
  await sbFetch(
    config,
    `events?ts=lt.${encodeURIComponent(new Date(Date.now() - 90 * 86400000).toISOString())}`,
    { method: 'DELETE' },
  );

  const statsJson = JSON.stringify({ this_week: thisWeek, prev_week: prevWeek, ab_14d: abAll, ab_action: abAction });

  // AI分析(キー未設定でも数値サマリーだけのレポートを残す)
  let analysis = '(ANTHROPIC_API_KEY 未設定のため、AI分析はスキップしました)';
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic();
      const response = await client.beta.messages.create({
        model: 'claude-opus-5',
        max_tokens: 4000,
        // 安全側のフォールバック(万一の拒否時に別モデルで継続)
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: `あなたはコーポレートサイトのCVR改善を支援するアナリストです。以下のサイト規範を必ず守り、規範の外の施策は提案しないでください。${BRAND_RULES}
出力は日本語のMarkdownで、次の4節のみ: ## 数値サマリー / ## 目立つ変化と仮説 / ## 改善案トップ3(各: 対象・変更案・期待効果・根拠) / ## 次週の観察ポイント。簡潔に。`,
        messages: [
          {
            role: 'user',
            content: `今週と前週の計測データ(JSON)です。分析してください。\n${statsJson}`,
          },
        ],
      });
      const text = response.content.find(
        (block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text',
      );
      if (response.stop_reason !== 'refusal' && text) analysis = text.text;
    } catch (error) {
      analysis = `(AI分析でエラーが発生しました: ${error instanceof Error ? error.message.slice(0, 120) : 'unknown'})`;
    }
  }

  const periodStart = timezoneDay(7);
  const periodEnd = timezoneDay(1);
  const summary = [
    `# 週次レポート ${periodStart} 〜 ${periodEnd}`,
    '',
    `- 訪問者: ${thisWeek.totals.sessions}(前週 ${prevWeek.totals.sessions})`,
    `- LINEタップ: ${thisWeek.totals.lineClicks}(前週 ${prevWeek.totals.lineClicks})`,
    `- フォーム送信: ${thisWeek.totals.formSubmits}(前週 ${prevWeek.totals.formSubmits})`,
    `- CVR: ${thisWeek.totals.cvr}%(前週 ${prevWeek.totals.cvr}%)`,
    `- A/Bテスト: ${abAction}`,
    '',
    analysis,
  ].join('\n');

  await sbFetch(config, 'reports', {
    method: 'POST',
    body: {
      period_start: periodStart,
      period_end: periodEnd,
      summary_md: summary,
      meta: { ab_action: abAction, winner },
    },
  });

  // メール送付(送信設定があるときだけ)
  const mail = readMailConfig(process.env);
  let mailed = false;
  if (mail) {
    const to = process.env.REPORT_TO?.trim() || mail.to;
    const result = await sendMail(
      { ...mail, to },
      {
        subject: `週次レポート ${periodStart}〜${periodEnd}|訪問${thisWeek.totals.sessions}・CVR ${thisWeek.totals.cvr}%`,
        text: summary,
        html: `<pre style="font-family:sans-serif;line-height:1.8;white-space:pre-wrap">${summary
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')}</pre>`,
      },
    );
    mailed = result.ok;
  }

  return new Response(
    JSON.stringify({ ok: true, sessions: thisWeek.totals.sessions, ab: abAction, mailed }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
