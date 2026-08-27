/**
 * A/Bテスト。事前に人が承認した候補の中からだけ配信する(勝手な文言生成はしない)。
 * 勝者が確定(週次分析で統計判定)すると、全訪問者に勝者を配信する。
 */
import { createHash } from 'node:crypto';
import { readAnalyticsConfig, sbFetch } from './db';

/** Hero提供価値の一文。A/B/C案は docs/content/home.md で承認済みの3案 */
export const HERO_VALUE_PROP_VARIANTS: Record<string, string> = {
  A: '個人の「思考OS」構築から、チームの自走化まで。教育×実践×リフレクションで一気通貫に伴走します。',
  B: '研修でも、コンサルでもない。現場で成果が出るまで隣を走る、成長伴走型の支援です。',
  C: '「わかる」を「できる」に変える。リーダーとチームの成長に、一気通貫で伴走します。',
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
