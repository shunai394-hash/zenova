-- =============================================================================
-- Zenova AI動画改善ループ — generated_videos 拡張設計コメント
--
-- 目的: 投稿結果・改善履歴を history に保存できる設計メモ。
-- 現状はクライアント localStorage（video-loop-storage）でも運用可能。
-- 必要になったら下記 ALTER を実行する。
-- =============================================================================

-- ---------------------------------------------------------------------------
-- public.generated_videos への推奨カラム
-- ---------------------------------------------------------------------------
-- post_status         text     -- created | scheduled | posted | improving
-- post_platform       text     -- tiktok | youtube_shorts | instagram_reels
-- post_views          integer
-- post_likes          integer
-- post_comments       integer
-- post_saves          integer
-- post_clicks         integer  -- 任意
-- post_purchases      integer  -- 任意
-- previous_score      integer  -- 改善前スコア
-- after_score         integer  -- 改善後（実績ベース推定）スコア
-- improvement_reason  text
-- next_video_plan     text
-- ai_reflection       jsonb    -- OptimizationReflection
-- next_video_ideas    jsonb    -- NextVideoIdea[]

-- 将来の拡張例（未実行でも可）:
-- alter table public.generated_videos
--   add column if not exists post_status text,
--   add column if not exists post_platform text,
--   add column if not exists post_views integer,
--   add column if not exists post_likes integer,
--   add column if not exists post_comments integer,
--   add column if not exists post_saves integer,
--   add column if not exists post_clicks integer,
--   add column if not exists post_purchases integer,
--   add column if not exists previous_score integer,
--   add column if not exists after_score integer,
--   add column if not exists improvement_reason text,
--   add column if not exists next_video_plan text,
--   add column if not exists ai_reflection jsonb,
--   add column if not exists next_video_ideas jsonb;

-- TypeScript:
-- - src/lib/ai-optimization-engine/
-- - src/lib/optimization/video-loop-storage.ts

select 1;
