-- =============================================================================
-- Zenova 動画パイプライン — video_jobs / pipeline_status 設計
-- （コメント + 任意の将来用 DDL。既存テーブルを壊さない）
-- =============================================================================

-- GenerationStatus:
--   idle → analyzing → planning → generating → completed
--                                      ↘ failed

-- ---------------------------------------------------------------------------
-- 既存 generated_videos への推奨拡張（未実行でも可）
-- ---------------------------------------------------------------------------
-- alter table public.generated_videos
--   add column if not exists pipeline_status text,
--   add column if not exists provider text,
--   add column if not exists provider_job_id text,
--   add column if not exists error_code text,
--   add column if not exists error_message text,
--   add column if not exists progress integer;

-- pipeline_status 値:
--   idle | analyzing | planning | generating | completed | failed
-- status（現行互換）:
--   pending | processing | completed | failed

-- ---------------------------------------------------------------------------
-- video_jobs（非同期プロバイダ向け・将来）
-- ---------------------------------------------------------------------------
-- create table if not exists public.video_jobs (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid,
--   product_id uuid references public.products(id) on delete set null,
--   provider text not null default 'mock',
--   provider_job_id text,
--   status text not null default 'idle',
--   error_code text,
--   error_message text,
--   video_url text,
--   thumbnail_url text,
--   video_plan jsonb,
--   analysis_result jsonb,
--   progress integer default 0,
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now()
-- );

-- VIDEO_PROVIDER 環境変数:
--   mock | kling | seedance | runway | sora | luma

select 1;
