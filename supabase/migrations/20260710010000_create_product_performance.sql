-- ZENOVA: 商品パフォーマンス（動画成果）
-- products と 1:1 で紐付け

create table if not exists public.product_performance (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  views integer not null default 0 check (views >= 0),
  likes integer not null default 0 check (likes >= 0),
  comments integer not null default 0 check (comments >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  sales integer not null default 0 check (sales >= 0),
  revenue numeric(12, 2) not null default 0 check (revenue >= 0),
  notes text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_performance_product_id_idx
  on public.product_performance (product_id);

create index if not exists product_performance_sales_idx
  on public.product_performance (sales desc);

comment on table public.product_performance is 'AI分析商品に紐づく動画・販売成果';
comment on column public.product_performance.clicks is 'プロフィール/リンククリック数';
comment on column public.product_performance.sales is '成約件数';
comment on column public.product_performance.revenue is '売上金額';

alter table public.product_performance enable row level security;

drop policy if exists "Allow public read product_performance" on public.product_performance;
create policy "Allow public read product_performance"
  on public.product_performance
  for select
  using (true);

drop policy if exists "Allow public insert product_performance" on public.product_performance;
create policy "Allow public insert product_performance"
  on public.product_performance
  for insert
  with check (true);

drop policy if exists "Allow public update product_performance" on public.product_performance;
create policy "Allow public update product_performance"
  on public.product_performance
  for update
  using (true);

drop policy if exists "Allow public delete product_performance" on public.product_performance;
create policy "Allow public delete product_performance"
  on public.product_performance
  for delete
  using (true);
