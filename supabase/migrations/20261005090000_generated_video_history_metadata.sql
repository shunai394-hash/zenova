-- ZENOVA: authenticated video history metadata
-- Additive migration; existing generated video rows remain valid.
alter table public.generated_videos
  add column if not exists user_id uuid,
  add column if not exists product_name text,
  add column if not exists source_url text,
  add column if not exists thumbnail_url text,
  add column if not exists script text,
  add column if not exists hook text,
  add column if not exists style text,
  add column if not exists status text not null default 'completed',
  add column if not exists marketing_score integer,
  add column if not exists conversion_score integer,
  add column if not exists ai_feedback text,
  add column if not exists previous_score integer,
  add column if not exists after_score integer,
  add column if not exists improvement_reason text,
  add column if not exists next_video_plan text,
  add column if not exists post_status text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists generated_videos_user_created_at_idx
  on public.generated_videos (user_id, created_at desc);

comment on column public.generated_videos.user_id is
  'Supabase Auth user ID that owns this generated video; legacy rows may be null.';
