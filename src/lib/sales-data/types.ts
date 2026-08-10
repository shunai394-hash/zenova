export type SalesScenarioRecord = {
  id: string;
  product_id: string;
  hook: string;
  selling_angle: string;
  scene_1: string;
  scene_2: string;
  scene_3: string;
  cta: string;
  kling_prompt: string;
  target_customer: string | null;
  created_at: string;
};

export type SaveSalesScenarioInput = {
  product_id: string;
  hook: string;
  selling_angle: string;
  scene_1: string;
  scene_2: string;
  scene_3: string;
  cta: string;
  kling_prompt: string;
  target_customer?: string | null;
};

export type GeneratedVideoStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

/**
 * GenerationStatus（パイプライン）との対応:
 *   idle → pending
 *   analyzing|planning|generating → processing
 *   completed → completed
 *   failed → failed
 * 詳細は @/lib/video-pipeline/job-record
 */

export type GeneratedVideoRecord = {
  id: string;
  user_id: string | null;
  product_id: string;
  product_name: string | null;
  source_url: string | null;
  video_url: string;
  thumbnail_url: string | null;
  script: string | null;
  hook: string | null;
  style: string | null;
  status: string;
  audio_url: string | null;
  score: number | null;
  hook_score: number | null;
  product_score: number | null;
  cta_score: number | null;
  tiktok_score: number | null;
  /** 投稿前AIマーケ診断（将来カラム） */
  marketing_score: number | null;
  conversion_score: number | null;
  ai_feedback: string | null;
  scenario_id: string | null;
  narration_script: string | null;
  created_at: string;
  updated_at: string;
};

export type SaveGeneratedVideoInput = {
  product_id: string;
  video_url: string;
  user_id?: string | null;
  product_name?: string | null;
  source_url?: string | null;
  thumbnail_url?: string | null;
  script?: string | null;
  hook?: string | null;
  style?: string | null;
  status?: GeneratedVideoStatus | string | null;
  audio_url?: string | null;
  score?: number | null;
  hook_score?: number | null;
  product_score?: number | null;
  cta_score?: number | null;
  tiktok_score?: number | null;
  /** 投稿前AIマーケ診断（DBカラム追加後に保存） */
  marketing_score?: number | null;
  conversion_score?: number | null;
  ai_feedback?: string | null;
  scenario_id?: string | null;
  narration_script?: string | null;
};
