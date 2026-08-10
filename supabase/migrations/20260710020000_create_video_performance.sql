-- ZENOVA: 動画分析データ基盤
-- TikTokで売れている動画パターンを蓄積

create table if not exists public.video_performance (
  id uuid primary key default gen_random_uuid(),

  -- 任意で products / product_performance と紐付け
  product_id uuid references public.products(id) on delete set null,
  product_performance_id uuid references public.product_performance(id) on delete set null,

  -- 分類
  product_category text not null default 'その他',
  video_template text not null,
  hook_type text not null default '',

  -- 成果指標
  views integer not null default 0 check (views >= 0),
  likes integer not null default 0 check (likes >= 0),
  comments integer not null default 0 check (comments >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  conversions integer not null default 0 check (conversions >= 0),
  revenue numeric(12, 2) not null default 0 check (revenue >= 0),

  -- 派生スコア（アプリ側で計算して保存可）
  intelligence_score integer,
  engagement_rate numeric(8, 4),
  ctr numeric(8, 4),
  conversion_rate numeric(8, 4),

  -- メタ
  platform text not null default 'TikTok',
  video_url text,
  notes text,
  source text not null default 'manual',

  -- 将来 TikTok API スナップショット
  tiktok_video_id text,
  tiktok_snapshot jsonb,

  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_performance_category_idx
  on public.video_performance (product_category);

create index if not exists video_performance_template_idx
  on public.video_performance (video_template);

create index if not exists video_performance_hook_type_idx
  on public.video_performance (hook_type);

create index if not exists video_performance_score_idx
  on public.video_performance (intelligence_score desc nulls last);

create index if not exists video_performance_views_idx
  on public.video_performance (views desc);

create index if not exists video_performance_product_id_idx
  on public.video_performance (product_id);

create index if not exists video_performance_tiktok_video_id_idx
  on public.video_performance (tiktok_video_id);

comment on table public.video_performance is 'TikTok販売動画パターンの蓄積（商品分析・動画生成に利用）';
comment on column public.video_performance.conversions is '成約件数';
comment on column public.video_performance.tiktok_snapshot is '将来 TikTok API から取得した生データ';

alter table public.video_performance enable row level security;

drop policy if exists "Allow public read video_performance" on public.video_performance;
create policy "Allow public read video_performance"
  on public.video_performance
  for select
  using (true);

drop policy if exists "Allow public insert video_performance" on public.video_performance;
create policy "Allow public insert video_performance"
  on public.video_performance
  for insert
  with check (true);

drop policy if exists "Allow public update video_performance" on public.video_performance;
create policy "Allow public update video_performance"
  on public.video_performance
  for update
  using (true);

drop policy if exists "Allow public delete video_performance" on public.video_performance;
create policy "Allow public delete video_performance"
  on public.video_performance
  for delete
  using (true);
