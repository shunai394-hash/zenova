/**
 * Supabase テーブル設計コメント（動画パイプライン）
 *
 * 既存テーブル:
 * - public.products（商品分析・履歴）
 * - public.generated_videos（生成動画）
 *
 * ---------------------------------------------------------------------------
 * products（商品）
 * ---------------------------------------------------------------------------
 * id, name, image, url, description, category, target, selling_points,
 * source, user_id, created_at, updated_at
 *
 * ---------------------------------------------------------------------------
 * videos（= generated_videos）
 * ---------------------------------------------------------------------------
 * id, user_id, product_id, video_url, thumbnail_url, status, created_at
 *
 * status マッピング:
 *   GenerationStatus     → generated_videos.status（現行）
 *   idle                 → pending
 *   analyzing|planning|generating → processing
 *   completed            → completed
 *   failed               → failed
 *
 * 推奨: pipeline_status カラムを追加し GenerationStatus をそのまま保存
 *
 * ---------------------------------------------------------------------------
 * video_jobs（新規推奨・非同期生成用）
 * ---------------------------------------------------------------------------
 * id, user_id, product_id, provider, provider_job_id,
 * status (idle|analyzing|planning|generating|completed|failed),
 * error_code, error_message, video_url, thumbnail_url,
 * video_plan jsonb, analysis_result jsonb, progress,
 * created_at, updated_at
 */

export const PIPELINE_DB_TABLES = {
  products: "products",
  /** 論理名 videos → 実テーブル generated_videos */
  videos: "generated_videos",
  /** 非同期ジョブ（設計・将来マイグレーション） */
  video_jobs: "video_jobs",
} as const;
