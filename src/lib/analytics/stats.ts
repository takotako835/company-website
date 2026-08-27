/** 計測イベントをダッシュボード用の数値に集計する(件数が少ない初期はJS集計で十分) */

export interface EventRow {
  ts: string;
  visitor_hash: string;
  path: string;
  type: string;
  meta: Record<string, unknown>;
  referrer: string | null;
  utm_source: string | null;
  device: string | null;
}

export interface Dashboard {
  totals: {
    sessions: number;
    pageviews: number;
    lineClicks: number;
    formSubmits: number;
    cvr: number; // (LINEタップした訪問者 + フォーム送信) / 訪問者
    mobileShare: number;
  };
  daily: { day: string; sessions: number; cv: number }[];
  funnelShindan: { start: number; result: number; lineClick: number };
  funnelForm: { view: number; start: number; submit: number };
  sources: { source: string; sessions: number; cv: number }[];
  pages: { path: string; pageviews: number; lineClicks: number }[];
  shindanTypes: { type: string; count: number }[];
  lineClickLocs: { loc: string; count: number }[];
  vitals: { lcpP75: number; clsP75: number; inpP75: number; samples: number };
  ab: { variant: string; sessions: number; cv: number; cvr: number }[];
}

const CV_TYPES = new Set(['cta_line_click', 'shindan_line_click', 'form_submit']);

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
}

function refHost(referrer: string | null): string {
  if (!referrer) return '(直接)';
  try {
    const host = new URL(referrer).hostname;
    return host.includes('google') ? 'Google' : host;
  } catch {
    return '(不明)';
  }
}

export function buildDashboard(events: EventRow[]): Dashboard {
  const visitors = new Set<string>();
  const cvVisitors = new Set<string>();
  const daily = new Map<string, { sessions: Set<string>; cv: Set<string> }>();
  const bySource = new Map<string, { sessions: Set<string>; cv: Set<string> }>();
  const byPage = new Map<string, { pageviews: number; lineClicks: number }>();
  const shindanTypes = new Map<string, number>();
  const lineLocs = new Map<string, number>();
  const visitorSource = new Map<string, string>();
  const abSessions = new Map<string, Set<string>>();
  const abCv = new Map<string, Set<string>>();
  const lcp: number[] = [];
  const cls: number[] = [];
  const inp: number[] = [];
  let pageviews = 0;
  let lineClicks = 0;
  let formSubmits = 0;
  let mobilePv = 0;
  const funnelShindan = { start: 0, result: 0, lineClick: 0 };
  const funnelForm = { view: 0, start: 0, submit: 0 };

  for (const event of events) {
    const day = event.ts.slice(0, 10);
    const visitor = event.visitor_hash;
    visitors.add(visitor);
    if (!daily.has(day)) daily.set(day, { sessions: new Set(), cv: new Set() });
    daily.get(day)!.sessions.add(visitor);

    // 訪問者の流入元は最初のpageviewで確定させる
    if (event.type === 'pageview' && !visitorSource.has(visitor)) {
      visitorSource.set(visitor, event.utm_source || refHost(event.referrer));
    }

    const abVariant = typeof event.meta.abHeroValueProp === 'string' ? event.meta.abHeroValueProp : null;

    switch (event.type) {
      case 'pageview': {
        pageviews++;
        if (event.device === 'mobile') mobilePv++;
        const page = byPage.get(event.path) ?? { pageviews: 0, lineClicks: 0 };
        page.pageviews++;
        byPage.set(event.path, page);
        if (abVariant) {
          if (!abSessions.has(abVariant)) abSessions.set(abVariant, new Set());
          abSessions.get(abVariant)!.add(visitor);
        }
        break;
      }
      case 'cta_line_click':
      case 'shindan_line_click': {
        lineClicks++;
        const loc = typeof event.meta.loc === 'string' ? event.meta.loc : '(不明)';
        lineLocs.set(loc, (lineLocs.get(loc) ?? 0) + 1);
        const page = byPage.get(event.path) ?? { pageviews: 0, lineClicks: 0 };
        page.lineClicks++;
        byPage.set(event.path, page);
        if (event.type === 'shindan_line_click') funnelShindan.lineClick++;
        break;
      }
      case 'form_view':
        funnelForm.view++;
        break;
      case 'form_start':
        funnelForm.start++;
        break;
      case 'form_submit':
        formSubmits++;
        funnelForm.submit++;
        break;
      case 'shindan_start':
        funnelShindan.start++;
        break;
      case 'shindan_result': {
        funnelShindan.result++;
        const type = typeof event.meta.type === 'string' ? event.meta.type : '?';
        shindanTypes.set(type, (shindanTypes.get(type) ?? 0) + 1);
        break;
      }
      case 'vitals': {
        if (typeof event.meta.lcp === 'number') lcp.push(event.meta.lcp);
        if (typeof event.meta.cls === 'number') cls.push(event.meta.cls);
        if (typeof event.meta.inp === 'number') inp.push(event.meta.inp);
        break;
      }
    }

    if (CV_TYPES.has(event.type)) {
      cvVisitors.add(visitor);
      daily.get(day)!.cv.add(visitor);
      if (abVariant) {
        if (!abCv.has(abVariant)) abCv.set(abVariant, new Set());
        abCv.get(abVariant)!.add(visitor);
      }
    }
  }

  for (const [visitor, source] of visitorSource) {
    if (!bySource.has(source)) bySource.set(source, { sessions: new Set(), cv: new Set() });
    bySource.get(source)!.sessions.add(visitor);
    if (cvVisitors.has(visitor)) bySource.get(source)!.cv.add(visitor);
  }

  const sessions = visitors.size;
  return {
    totals: {
      sessions,
      pageviews,
      lineClicks,
      formSubmits,
      cvr: sessions ? Math.round((cvVisitors.size / sessions) * 1000) / 10 : 0,
      mobileShare: pageviews ? Math.round((mobilePv / pageviews) * 100) : 0,
    },
    daily: [...daily.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, d]) => ({ day, sessions: d.sessions.size, cv: d.cv.size })),
    funnelShindan,
    funnelForm,
    sources: [...bySource.entries()]
      .map(([source, d]) => ({ source, sessions: d.sessions.size, cv: d.cv.size }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10),
    pages: [...byPage.entries()]
      .map(([path, d]) => ({ path, ...d }))
      .sort((a, b) => b.pageviews - a.pageviews)
      .slice(0, 12),
    shindanTypes: [...shindanTypes.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    lineClickLocs: [...lineLocs.entries()]
      .map(([loc, count]) => ({ loc, count }))
      .sort((a, b) => b.count - a.count),
    vitals: {
      lcpP75: percentile(lcp, 75),
      clsP75: percentile(cls, 75),
      inpP75: percentile(inp, 75),
      samples: lcp.length,
    },
    ab: [...abSessions.entries()]
      .map(([variant, sessionSet]) => {
        const cv = abCv.get(variant)?.size ?? 0;
        return {
          variant,
          sessions: sessionSet.size,
          cv,
          cvr: sessionSet.size ? Math.round((cv / sessionSet.size) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => a.variant.localeCompare(b.variant)),
  };
}

/**
 * A/Bテストの勝敗判定(2標本の比率のz検定・95%有意)。
 * 判定できるだけの量が貯まるまでは null を返す
 */
export function judgeAbWinner(
  ab: Dashboard['ab'],
  minSessionsPerVariant = 100,
): string | null {
  const ready = ab.filter((v) => v.sessions >= minSessionsPerVariant);
  if (ready.length < 2 || ready.length !== ab.length) return null;
  const sorted = [...ready].sort((a, b) => b.cv / b.sessions - a.cv / a.sessions);
  const [best, second] = [sorted[0]!, sorted[1]!];
  const p1 = best.cv / best.sessions;
  const p2 = second.cv / second.sessions;
  const pooled = (best.cv + second.cv) / (best.sessions + second.sessions);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / best.sessions + 1 / second.sessions));
  if (se === 0) return null;
  const z = (p1 - p2) / se;
  return z >= 1.96 ? best.variant : null;
}
