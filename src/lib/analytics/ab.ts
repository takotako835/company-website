/**
 * A/Bテスト。事前に人が承認した候補の中からだけ配信する(勝手な文言生成はしない)。
 * 勝者が確定(週次分析で統計判定)すると、全訪問者に勝者を配信する。
 */
import { createHash } from 'node:crypto';
import { readAnalyticsConfig, sbFetch } from './db';

/**
 * Hero提供価値の一文。A/B/C案は docs/content/home.md で承認済みの3案。
 * 2026年8月28日改訂: ファーストビューは一読で理解できることを最優先し、
 * 専門用語(思考OS・教育×実践×リフレクション)を外して「何を提供するか」を具体語で書く。
 * 3案は角度で分ける(A=対象の広さ / B=他との違い / C=成果の形)
 */
export const HERO_VALUE_PROP_VARIANTS: Record<string, string> = {
  A: '1on1と少人数研修で、現場で成果が出るまで伴走します。個人でも、企業のチーム単位でも承っています。',
  B: '研修でも、コンサルでもありません。1on1と少人数研修で、自分でできるようになるまで伴走します。',
  C: '「わかる」を「できる」に。1on1と少人数研修で、部下が育ち、任せられるようになるまで伴走します。',
};

interface AbConfigRow {
  key: string;
  variants: string[];
  status: string;
  winner: string | null;
}

// 設定はリクエストごとにDBへ行かず、60秒だけメモリに持つ
let cache: { at: number; rows: AbConfigRow[] } | null = null;

async function loadConfig(): Promise<AbConfigRow[]> {
  if (cache && Date.now() - cache.at < 60000) return cache.rows;
  const config = readAnalyticsConfig();
  if (!config) return [];
  const result = await sbFetch(config, 'ab_config?select=*');
  const rows = result.ok ? (result.rows as unknown as AbConfigRow[]) : [];
  cache = { at: Date.now(), rows };
  return rows;
}

/**
 * 訪問者に配信する変種を決める。
 * 勝者確定後は勝者固定。テスト中は訪問者ハッシュで安定的に振り分ける
 */
export async function pickVariant(key: string, visitorSeed: string): Promise<string> {
  const rows = await loadConfig();
  const row = rows.find((r) => r.key === key);
  const variants = row?.variants?.length ? row.variants : ['A'];
  if (row?.status === 'done' && row.winner && variants.includes(row.winner)) {
    return row.winner;
  }
  const n = parseInt(createHash('sha256').update(`${key}|${visitorSeed}`).digest('hex').slice(0, 8), 16);
  return variants[n % variants.length] ?? 'A';
}
