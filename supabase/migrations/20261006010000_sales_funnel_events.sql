create table if not exists public.sales_funnel_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  event_name text not null check (event_name in (
    'landing_view','cta_click','product_input','analysis_started',
    'video_generation_started','video_generation_succeeded',
    'video_generation_failed','pricing_view','checkout_started',
    'checkout_succeeded','lead_captured'
  )),
  path text,
  source text,
  medium text,
  campaign text,
  content text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sales_funnel_events_created_at_idx
  on public.sales_funnel_events(created_at desc);
create index if not exists sales_funnel_events_session_id_idx
  on public.sales_funnel_events(session_id, created_at desc);
create index if not exists sales_funnel_events_user_id_idx
  on public.sales_funnel_events(user_id, created_at desc);

alter table public.sales_funnel_events enable row level security;

create policy "sales funnel events insert"
  on public.sales_funnel_events for insert
  with check (true);

create policy "sales funnel events service read"
  on public.sales_funnel_events for select
  using (auth.role() = 'service_role');
