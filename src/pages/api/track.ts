import type { APIRoute } from 'astro';
import { readAnalyticsConfig, sbFetch, visitorHash } from '../../lib/analytics/db';

// 受け付けるイベント種別(それ以外は捨てる)
const EVENT_TYPES = new Set([
  'pageview',
  'cta_line_click',
  'cta_contact_click',
  'form_view',
  'form_start',
  'form_submit',
  'shindan_start',
  'shindan_question',
  'shindan_result',
  'shindan_line_click',
  'legacy_click',
  'scroll_depth',
  'vitals',
]);

const BOT_PATTERN = /bot|crawl|spider|slurp|headless|lighthouse|prerender|preview/i;

/** 同一訪問者からの連投を抑える(1分あたり60イベントまで) */
const RATE = { max: 60, windowMs: 60000 };
const recent = new Map<string, number[]>();

function isRateLimited(key: string, now: number): boolean {
  const history = (recent.get(key) ?? []).filter((at) => now - at < RATE.windowMs);
  history.push(now);
  recent.set(key, history);
  if (recent.size > 2000) {
    for (const [k, v] of recent) {
      if (v.every((at) => now - at >= RATE.windowMs)) recent.delete(k);
    }
  }
  return history.length > RATE.max;
}

const clip = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value ? value.slice(0, max) : null;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const noContent = new Response(null, { status: 204 });

  // 未設定のあいだは計測を静かに無効化(サイト本体に影響させない)
  const config = readAnalyticsConfig();
  if (!config) return noContent;

  const ua = request.headers.get('user-agent') ?? '';
  if (!ua || BOT_PATTERN.test(ua)) return noContent;

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await request.text()) as Record<string, unknown>;
  } catch {
    return noContent;
  }

  const type = typeof body.type === 'string' ? body.type : '';
  const path = typeof body.path === 'string' ? body.path : '';
  if (!EVENT_TYPES.has(type) || !path.startsWith('/') || path.length > 200) return noContent;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || clientAddress || '';
  const visitor = visitorHash(ip, ua);
  if (isRateLimited(visitor, Date.now())) return noContent;

  const meta =
    body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta)
      ? (body.meta as Record<string, unknown>)
      : {};
  if (JSON.stringify(meta).length > 2000) return noContent;

  // 挿入の失敗で訪問者の体験を止めない(応答は常に204)
  await sbFetch(config, 'events', {
    method: 'POST',
    body: {
      visitor_hash: visitor,
      path,
      type,
      meta,
      referrer: clip(body.referrer, 300),
      utm_source: clip(body.utm_source, 100),
      utm_medium: clip(body.utm_medium, 100),
      utm_campaign: clip(body.utm_campaign, 100),
      device: /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop',
    },
  });

  return noContent;
};
