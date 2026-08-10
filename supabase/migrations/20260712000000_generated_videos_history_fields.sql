-- generated_videos: history UI / auto-save 用カラム追加（既存互換）

alter table public.generated_videos
  add column if not exists user_id text,
  add column if not exists product_name text,
  add column if not exists source_url text,
  add column if not exists thumbnail_url text,
  add column if not exists script text,
  add column if not exists hook text,
  add column if not exists style text,
  add column if not exists status text not null default 'completed',
  add column if not exists updated_at timestamptz not null default now();

-- product_id は既存どおり（FK）。無い場合の履歴表示用に product_name を保持。

create index if not exists generated_videos_user_id_idx
  on public.generated_videos (user_id);

create index if not exists generated_videos_status_idx
  on public.generated_videos (status);

create index if not exists generated_videos_updated_at_idx
  on public.generated_videos (updated_at desc);

-- updated_at 自動更新
create or replace function public.set_generated_videos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists generated_videos_set_updated_at on public.generated_videos;
create trigger generated_videos_set_updated_at
  before update on public.generated_videos
  for each row
  execute function public.set_generated_videos_updated_at();
