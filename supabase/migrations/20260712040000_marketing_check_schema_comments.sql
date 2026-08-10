-- =============================================================================
-- Zenova 投稿前AIマーケティング診断 — generated_videos 拡張設計コメント
--
-- 目的: marketing_score / hook_score / conversion_score / ai_feedback を
--       history に保存できる設計メモ。既存マイグレーションを壊さない。
-- 必要になったら下記 ALTER を実行する（現時点ではコメント設計のみ）。
-- =============================================================================

-- ---------------------------------------------------------------------------
-- public.generated_videos への推奨カラム
-- ---------------------------------------------------------------------------
-- marketing_score   integer     -- 動画販売力スコア 0–100（MarketingCheckReport.salesPowerScore）
-- hook_score        integer     -- フック力 0–100（既存あれば流用可）
-- conversion_score  integer     -- 購入誘導 0–100
-- ai_feedback       text        -- 診断サマリ（MarketingCheckReport.aiFeedback）
-- marketing_checked_at timestamptz -- 診断実行日時（任意）

-- 将来の拡張例（未実行でも可）:
-- alter table public.generated_videos
--   add column if not exists marketing_score integer,
--   add column if not exists conversion_score integer,
--   add column if not exists ai_feedback text,
--   add column if not exists marketing_checked_at timestamptz;
--
-- ※ hook_score は既存ダッシュボード用カラムがある場合はそのまま利用。
-- ※ 無い場合のみ:
-- alter table public.generated_videos
--   add column if not exists hook_score integer;

-- TypeScript 対応:
-- - src/lib/sales-data/types.ts          SaveGeneratedVideoInput / GeneratedVideoRecord
-- - src/lib/sales-data/video-history-types.ts  GeneratedVideoHistoryItem
-- - src/lib/ai-marketing-engine/         診断ロジック

select 1; -- no-op（コメント専用ファイルでも SQL として有効）
