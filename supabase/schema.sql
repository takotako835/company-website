-- ============================================================
--  アクセス計測・自動改善ループ用スキーマ
--  Supabase の SQL Editor にこのファイル全体を貼り付けて実行する
--  (docs/08_analytics-improvement.md / セットアップ手順参照)
-- ============================================================

-- 計測イベント(明細。90日で自動削除される — 週次分析ジョブが消す)
create table if not exists events (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  visitor_hash text not null,        -- IP+UA+日替わりソルトのハッシュ(翌日には突合不能)
  path text not null,
  type text not null,                -- pageview / cta_line_click / form_* / shindan_* / scroll_depth / vitals
  meta jsonb not null default '{}',
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text                        -- mobile / desktop
);

create index if not exists events_ts_idx on events (ts);
create index if not exists events_type_ts_idx on events (type, ts);

-- A/Bテストの設定(勝者が決まると status='done' + winner が入る)
create table if not exists ab_config (
  key text primary key,
  variants jsonb not null,           -- 例: ["A","B","C"]
  status text not null default 'running',  -- running | done
  winner text,
  updated_at timestamptz not null default now()
);

insert into ab_config (key, variants) values ('hero_value_prop', '["A","B","C"]')
on conflict (key) do nothing;

-- 週次分析レポート
create table if not exists reports (
  id bigint generated always as identity primary key,
  period_start date not null,
  period_end date not null,
  summary_md text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
--  セキュリティ: サーバー(service_role キー)以外からは一切触れない。
--  RLS を有効化し、anon 向けポリシーを作らない = 公開アクセス全遮断
-- ============================================================
alter table events enable row level security;
alter table ab_config enable row level security;
alter table reports enable row level security;
