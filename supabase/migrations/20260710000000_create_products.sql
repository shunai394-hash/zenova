-- ZENOVA: 商品分析履歴
-- Supabase SQL Editor で実行、または supabase db push

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  description text not null default '',
  target text not null default '',
  platform text not null default '',
  product_url text,
  image_name text,
  analysis jsonb not null,
  sales_score integer,
  sales_grade text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_created_at_idx
  on public.products (created_at desc);

create index if not exists products_sales_score_idx
  on public.products (sales_score desc nulls last);

create index if not exists products_product_name_idx
  on public.products (product_name);

comment on table public.products is 'TikTok販売向け商品分析履歴';
comment on column public.products.analysis is 'ProductAnalysis JSON (version 1.0)';

-- 開発用: 公開キーからの読み書きを許可（本番では auth.uid() ベースのRLSに変更）
alter table public.products enable row level security;

drop policy if exists "Allow public read products" on public.products;
create policy "Allow public read products"
  on public.products
  for select
  using (true);

drop policy if exists "Allow public insert products" on public.products;
create policy "Allow public insert products"
  on public.products
  for insert
  with check (true);

drop policy if exists "Allow public update products" on public.products;
create policy "Allow public update products"
  on public.products
  for update
  using (true);

drop policy if exists "Allow public delete products" on public.products;
create policy "Allow public delete products"
  on public.products
  for delete
  using (true);
