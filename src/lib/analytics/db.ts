/**
 * Supabase(PostgREST)への薄いアクセス層。
 *
 * SDKを追加せず fetch だけで完結させる(依存を増やさない方針)。
 * 環境変数が未設定のあいだは全機能が静かに無効になり、サイト本体には影響しない。
 * キーは service_role のためサーバー専用。クライアントに渡してはならない。
 */
import { createHmac } from 'node:crypto';

export interface AnalyticsConfig {
  url: string;
  serviceKey: string;
}

/**
 * SUPABASE_URL を正規化する。
 * 「Project URL」ではなく「RESTful endpoint」(…/rest/v1)を貼ってしまう間違いが起きやすく、
 * そのままだとパスが二重になって PGRST125 になるため、末尾の /rest/v1 を取り除く
 */
export function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest(\/v1)?$/, '')
    .replace(/\/+$/, '');
}

export function readAnalyticsConfig(): AnalyticsConfig | null {
  const raw = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!raw || !serviceKey) return null;
  const url = normalizeSupabaseUrl(raw);
  if (!url) return null;
  return { url, serviceKey };
}

export type SbResult = { ok: true; rows: unknown[] } | { ok: false; status: number };

export async function sbFetch(
  config: AnalyticsConfig,
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<SbResult> {
  let res: Response;
  try {
    res = await fetch(`${config.url}/rest/v1/${path}`, {
      method: init.method ?? 'GET',
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: init.method === 'POST' ? 'return=minimal' : 'return=representation',
        ...init.headers,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return { ok: false, status: 0 };
  }
  if (!res.ok) return { ok: false, status: res.status };
  if (res.status === 204 || init.method === 'POST') return { ok: true, rows: [] };
  const rows = (await res.json().catch(() => [])) as unknown[];
  return { ok: true, rows: Array.isArray(rows) ? rows : [rows] };
}

export interface TableDiagnosis {
  table: string;
  status: number;
  ok: boolean;
  detail: string;
}

/** Supabase の応答から、設定のどこを直せばよいかを日本語で言い当てる */
function explain(status: number, body: string): string {
  if (status >= 200 && status < 300) {
    let rows: unknown[] = [];
    try {
      rows = JSON.parse(body || '[]') as unknown[];
    } catch {
      return '読み取りOK';
    }
    return Array.isArray(rows) && rows.length > 0 ? '読み取りOK(データあり)' : '読み取りOK(まだ0件)';
  }
  // PGRST125 = パスが不正。SUPABASE_URL に /rest/v1 まで含めてしまった典型例
  if (body.includes('PGRST125') || body.includes('Invalid path')) {
    return 'SUPABASE_URL が違います。「https://xxxxx.supabase.co」だけを設定してください(/rest/v1 は不要)';
  }
  // PGRST205 = スキーマキャッシュにテーブルがない
  if (body.includes('PGRST205') || body.includes('does not exist') || body.includes('42P01')) {
    return 'テーブルがありません。SQL Editor で supabase/schema.sql を実行してください';
  }
  if (status === 401 || status === 403) {
    return 'キーが拒否されました。Secret key(sb_secret_…)を使っているか確認してください';
  }
  if (status === 404) {
    return 'URLかテーブルが違います。SUPABASE_URL と schema.sql の実行を確認してください';
  }
  if (status === 0) return '接続できません(URLのホスト名を確認してください)';
  return body.slice(0, 160) || `HTTP ${status}`;
}

/**
 * 各テーブルに実際に触って、つながらない理由を突き止める。
 * 通常の読み書きはエラーを握りつぶすため、原因を見るにはこの関数を使う
 */
export async function diagnose(config: AnalyticsConfig): Promise<TableDiagnosis[]> {
  const out: TableDiagnosis[] = [];
  for (const table of ['events', 'ab_config', 'reports']) {
    try {
      const res = await fetch(`${config.url}/rest/v1/${table}?select=*&limit=1`, {
        headers: {
          apikey: config.serviceKey,
          Authorization: `Bearer ${config.serviceKey}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      const body = await res.text();
      out.push({ table, status: res.status, ok: res.ok, detail: explain(res.status, body) });
    } catch (error) {
      out.push({
        table,
        status: 0,
        ok: false,
        detail: `接続できません: ${error instanceof Error ? error.message.slice(0, 80) : 'unknown'}`,
      });
    }
  }
  return out;
}

/** 書き込みが通るかを実際に試す(1件入れて、すぐ消す) */
export async function diagnoseWrite(config: AnalyticsConfig): Promise<TableDiagnosis> {
  const marker = `diagnostic-${Date.now()}`;
  try {
    const res = await fetch(`${config.url}/rest/v1/events`, {
      method: 'POST',
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ visitor_hash: marker, path: '/__diagnostic', type: 'pageview' }),
      signal: AbortSignal.timeout(10000),
    });
    const body = res.ok ? '' : await res.text();
    if (res.ok) {
      await sbFetch(config, `events?visitor_hash=eq.${marker}`, { method: 'DELETE' });
    }
    return {
      table: 'events(書き込み)',
      status: res.status,
      ok: res.ok,
      detail: res.ok ? '書き込みOK' : explain(res.status, body),
    };
  } catch (error) {
    return {
      table: 'events(書き込み)',
      status: 0,
      ok: false,
      detail: `接続できません: ${error instanceof Error ? error.message.slice(0, 80) : 'unknown'}`,
    };
  }
}

/** 期間内のイベントを全件取得する(1000件ずつページング) */
export async function fetchEvents(
  config: AnalyticsConfig,
  sinceIso: string,
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  for (let offset = 0; offset < 100000; offset += 1000) {
    const result = await sbFetch(
      config,
      `events?select=*&ts=gte.${encodeURIComponent(sinceIso)}&order=ts.asc&limit=1000&offset=${offset}`,
    );
    if (!result.ok) break;
    all.push(...(result.rows as Record<string, unknown>[]));
    if (result.rows.length < 1000) break;
  }
  return all;
}

/**
 * 訪問者ハッシュ。IP+UA+日替わりソルトのHMACで、
 * 同日内の同一訪問者だけを束ねられる(翌日には突合できない=個人を追跡しない)
 */
export function visitorHash(ip: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10);
  const key = process.env.ANALYZE_SECRET || 'no-secret';
  return createHmac('sha256', key).update(`${day}|${ip}|${userAgent}`).digest('hex').slice(0, 24);
}
