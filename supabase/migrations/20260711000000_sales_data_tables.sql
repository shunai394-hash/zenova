-- ZENOVA: 販売データ蓄積（自己完結）
-- Supabase SQL Editor でこのファイルを実行してください。
-- 既存 products がある場合も安全（IF NOT EXISTS / ADD COLUMN IF NOT EXISTS）

-- ---------------------------------------------------------------------------
-- products（既存互換 + name/category/image_url）
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  description text not null default '',
  target text not null default '',
  platform text not null default '',
  product_url text,
  image_name text,
  analysis jsonb not null default '{}'::jsonb,
  sales_score integer,
  sales_grade text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists name text,
  add column if not exists category text,
  add column if not exists image_url text;

update public.products
set name = coalesce(nullif(name, ''), product_name)
where name is null or name = '';

create index if not exists products_created_at_idx
  on public.products (created_at desc);

create index if not exists products_sales_score_idx
  on public.products (sales_score desc nulls last);

create index if not exists products_product_name_idx
  on public.products (product_name);

create index if not exists products_name_idx
  on public.products (name);

create index if not exists products_category_idx
  on public.products (category);

alter table public.products enable row level security;

drop policy if exists "Allow public read products" on public.products;
create policy "Allow public read products"
  on public.products for select using (true);

drop policy if exists "Allow public insert products" on public.products;
create policy "Allow public insert products"
  on public.products for insert with check (true);

drop policy if exists "Allow public update products" on public.products;
create policy "Allow public update products"
  on public.products for update using (true);

drop policy if exists "Allow public delete products" on public.products;
create policy "Allow public delete products"
  on public.products for delete using (true);

-- ---------------------------------------------------------------------------
-- sales_scenarios
-- ---------------------------------------------------------------------------
create table if not exists public.sales_scenarios (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  hook text not null default '',
  selling_angle text not null default '',
  scene_1 text not null default '',
  scene_2 text not null default '',
  scene_3 text not null default '',
  cta text not null default '',
  kling_prompt text not null default '',
  target_customer text,
  created_at timestamptz not null default now()
);

create index if not exists sales_scenarios_product_id_idx
  on public.sales_scenarios (product_id);

create index if not exists sales_scenarios_created_at_idx
  on public.sales_scenarios (created_at desc);

alter table public.sales_scenarios enable row level security;

drop policy if exists "Allow public read sales_scenarios" on public.sales_scenarios;
create policy "Allow public read sales_scenarios"
  on public.sales_scenarios for select using (true);

drop policy if exists "Allow public insert sales_scenarios" on public.sales_scenarios;
create policy "Allow public insert sales_scenarios"
  on public.sales_scenarios for insert with check (true);

drop policy if exists "Allow public update sales_scenarios" on public.sales_scenarios;
create policy "Allow public update sales_scenarios"
  on public.sales_scenarios for update using (true);

drop policy if exists "Allow public delete sales_scenarios" on public.sales_scenarios;
create policy "Allow public delete sales_scenarios"
  on public.sales_scenarios for delete using (true);

-- ---------------------------------------------------------------------------
-- generated_videos
-- ---------------------------------------------------------------------------
create table if not exists public.generated_videos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  video_url text not null default '',
  audio_url text,
  score integer,
  hook_score integer,
  product_score integer,
  cta_score integer,
  tiktok_score integer,
  scenario_id uuid references public.sales_scenarios(id) on delete set null,
  narration_script text,
  created_at timestamptz not null default now()
);

create index if not exists generated_videos_product_id_idx
  on public.generated_videos (product_id);

create index if not exists generated_videos_created_at_idx
  on public.generated_videos (created_at desc);

create index if not exists generated_videos_score_idx
  on public.generated_videos (score desc nulls last);

alter table public.generated_videos enable row level security;

drop policy if exists "Allow public read generated_videos" on public.generated_videos;
create policy "Allow public read generated_videos"
  on public.generated_videos for select using (true);

drop policy if exists "Allow public insert generated_videos" on public.generated_videos;
create policy "Allow public insert generated_videos"
  on public.generated_videos for insert with check (true);

drop policy if exists "Allow public update generated_videos" on public.generated_videos;
create policy "Allow public update generated_videos"
  on public.generated_videos for update using (true);

drop policy if exists "Allow public delete generated_videos" on public.generated_videos;
create policy "Allow public delete generated_videos"
  on public.generated_videos for delete using (true);
