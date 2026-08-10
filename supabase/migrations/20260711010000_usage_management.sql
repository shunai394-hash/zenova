-- ZENOVA: 料金プラン・利用制限・動画クレジット管理
-- Supabase SQL Editor でこのファイルを実行してください。
-- 既存テーブルは変更しない（追加のみ）

-- ---------------------------------------------------------------------------
-- plans
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id text primary key,
  name text not null,
  price integer not null default 0,
  video_limit integer not null default 0,
  image_limit integer not null default 0,
  analysis_limit integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.plans (id, name, price, video_limit, image_limit, analysis_limit)
values
  ('free', 'Free', 0, 1, 5, 20),
  ('starter', 'Starter', 2980, 5, 30, 100),
  ('creator', 'Creator', 9800, 30, 100, 300),
  ('pro', 'Pro', 19800, 80, 300, 800),
  ('business', 'Business', 49800, 150, 600, 1500)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  video_limit = excluded.video_limit,
  image_limit = excluded.image_limit,
  analysis_limit = excluded.analysis_limit;

alter table public.plans enable row level security;

drop policy if exists "Allow public read plans" on public.plans;
create policy "Allow public read plans"
  on public.plans for select using (true);

drop policy if exists "Allow public insert plans" on public.plans;
create policy "Allow public insert plans"
  on public.plans for insert with check (true);

drop policy if exists "Allow public update plans" on public.plans;
create policy "Allow public update plans"
  on public.plans for update using (true);

-- ---------------------------------------------------------------------------
-- user_subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan_id text not null references public.plans(id),
  status text not null default 'active',
  period_start timestamptz not null default now(),
  period_end timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create index if not exists user_subscriptions_user_id_idx
  on public.user_subscriptions (user_id);

create index if not exists user_subscriptions_status_idx
  on public.user_subscriptions (status);

create index if not exists user_subscriptions_user_status_idx
  on public.user_subscriptions (user_id, status);

alter table public.user_subscriptions enable row level security;

drop policy if exists "Allow public read user_subscriptions" on public.user_subscriptions;
create policy "Allow public read user_subscriptions"
  on public.user_subscriptions for select using (true);

drop policy if exists "Allow public insert user_subscriptions" on public.user_subscriptions;
create policy "Allow public insert user_subscriptions"
  on public.user_subscriptions for insert with check (true);

drop policy if exists "Allow public update user_subscriptions" on public.user_subscriptions;
create policy "Allow public update user_subscriptions"
  on public.user_subscriptions for update using (true);

drop policy if exists "Allow public delete user_subscriptions" on public.user_subscriptions;
create policy "Allow public delete user_subscriptions"
  on public.user_subscriptions for delete using (true);

-- ---------------------------------------------------------------------------
-- usage_logs
-- ---------------------------------------------------------------------------
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  usage_type text not null,
  amount integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_logs_user_id_idx
  on public.usage_logs (user_id);

create index if not exists usage_logs_usage_type_idx
  on public.usage_logs (usage_type);

create index if not exists usage_logs_user_type_created_idx
  on public.usage_logs (user_id, usage_type, created_at desc);

alter table public.usage_logs enable row level security;

drop policy if exists "Allow public read usage_logs" on public.usage_logs;
create policy "Allow public read usage_logs"
  on public.usage_logs for select using (true);

drop policy if exists "Allow public insert usage_logs" on public.usage_logs;
create policy "Allow public insert usage_logs"
  on public.usage_logs for insert with check (true);

-- ---------------------------------------------------------------------------
-- video_credits
-- ---------------------------------------------------------------------------
create table if not exists public.video_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  credits integer not null,
  source text not null default 'bonus',
  created_at timestamptz not null default now()
);

create index if not exists video_credits_user_id_idx
  on public.video_credits (user_id);

create index if not exists video_credits_user_created_idx
  on public.video_credits (user_id, created_at desc);

alter table public.video_credits enable row level security;

drop policy if exists "Allow public read video_credits" on public.video_credits;
create policy "Allow public read video_credits"
  on public.video_credits for select using (true);

drop policy if exists "Allow public insert video_credits" on public.video_credits;
create policy "Allow public insert video_credits"
  on public.video_credits for insert with check (true);

-- ---------------------------------------------------------------------------
-- ローカル／未認証デフォルト利用者（既存 create-sales-video を止めない）
-- user_id = 00000000-0000-4000-8000-000000000001 → starter
-- ---------------------------------------------------------------------------
insert into public.user_subscriptions (
  user_id,
  plan_id,
  status,
  period_start,
  period_end
)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  'starter',
  'active',
  now(),
  now() + interval '30 days'
where not exists (
  select 1
  from public.user_subscriptions
  where user_id = '00000000-0000-4000-8000-000000000001'::uuid
    and status = 'active'
);

