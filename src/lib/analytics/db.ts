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

export function readAnalyticsConfig(): AnalyticsConfig | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;
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
      let detail: string;
      if (res.ok) {
        const rows = JSON.parse(body || '[]') as unknown[];
        detail = rows.length > 0 ? '読み取りOK(データあり)' : '読み取りOK(まだ0件)';
      } else if (res.status === 404) {
        detail = 'テーブルがありません。SQL Editor で supabase/schema.sql を実行してください';
      } else if (res.status === 401 || res.status === 403) {
        detail = 'キーが拒否されました。Secret key(sb_secret_…)を使っているか確認してください';
      } else {
        detail = body.slice(0, 160);
      }
      out.push({ table, status: res.status, ok: res.ok, detail });
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
    const body = res.ok ? '' : (await res.text()).slice(0, 160);
    if (res.ok) {
      await sbFetch(config, `events?visitor_hash=eq.${marker}`, { method: 'DELETE' });
    }
    return {
      table: 'events(書き込み)',
      status: res.status,
      ok: res.ok,
      detail: res.ok
        ? '書き込みOK'
        : res.status === 401 || res.status === 403
          ? 'キーが書き込みを拒否しました。RLSを迂回できる Secret key か確認してください'
          : body,
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
