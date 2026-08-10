/**
 * 生成ジョブの DB 保存用レコード設計
 *
 * テーブル候補: public.video_jobs（新規）または generated_videos 拡張
 * status は GenerationStatus をそのまま保存する。
 */

import type {
  AnalysisResult,
  GenerationStatus,
  PipelineVideoProviderId,
  VideoPlan,
  VideoResult,
} from "./types";
import type { ProviderJobStatus } from "./providers/types";

/**
 * DB 行イメージ（Supabase）
 *
 * create table public.video_jobs (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid,
 *   product_id uuid references public.products(id),
 *   provider text not null,           -- mock|kling|seedance|...
 *   provider_job_id text,             -- 外部 API の job/task id
 *   status text not null,             -- idle|analyzing|planning|generating|completed|failed
 *   error_code text,
 *   error_message text,
 *   video_url text,
 *   thumbnail_url text,
 *   video_plan jsonb,
 *   analysis_result jsonb,
 *   progress integer,
 *   created_at timestamptz not null default now(),
 *   updated_at timestamptz not null default now()
 * );
 */
export type VideoJobRecord = {
  id: string;
  user_id: string | null;
  product_id: string | null;
  provider: PipelineVideoProviderId | string;
  provider_job_id: string | null;
  status: GenerationStatus;
  error_code: string | null;
  error_message: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  video_plan: VideoPlan | null;
  analysis_result: AnalysisResult | null;
  progress: number | null;
  created_at: string;
  updated_at: string;
};

/** generated_videos.status（現行）へマッピング */
export type LegacyGeneratedVideoStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export function generationStatusToLegacyDb(
  status: GenerationStatus
): LegacyGeneratedVideoStatus {
  switch (status) {
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "idle":
      return "pending";
    case "analyzing":
    case "planning":
    case "generating":
      return "processing";
    default:
      return "pending";
  }
}

export function legacyDbToGenerationStatus(
  raw: string | null | undefined
): GenerationStatus {
  const key = (raw || "").trim().toLowerCase();
  if (
    key === "idle" ||
    key === "analyzing" ||
    key === "planning" ||
    key === "generating" ||
    key === "completed" ||
    key === "failed"
  ) {
    return key;
  }
  if (key === "pending") return "idle";
  if (key === "processing" || key === "running" || key === "queued") {
    return "generating";
  }
  if (key === "succeed" || key === "succeeded" || key === "success") {
    return "completed";
  }
  return "idle";
}

/** ProviderJobStatus → VideoJobRecord の更新パッチ */
export function providerStatusToJobPatch(
  status: ProviderJobStatus
): Partial<VideoJobRecord> {
  const result: VideoResult | null | undefined = status.result;
  return {
    provider_job_id: status.jobId,
    provider: status.provider,
    status: status.status,
    error_code: status.errorCode ?? null,
    error_message: status.error ?? null,
    progress: status.progress ?? null,
    video_url: result?.videoUrl ?? null,
    thumbnail_url: result?.thumbnail ?? null,
    updated_at: status.updatedAt || new Date().toISOString(),
  };
}

export function createVideoJobDraft(input: {
  id: string;
  userId?: string | null;
  productId?: string | null;
  provider: PipelineVideoProviderId | string;
  plan?: VideoPlan | null;
  analysis?: AnalysisResult | null;
  status?: GenerationStatus;
}): VideoJobRecord {
  const now = new Date().toISOString();
  return {
    id: input.id,
    user_id: input.userId ?? null,
    product_id: input.productId ?? null,
    provider: input.provider,
    provider_job_id: null,
    status: input.status ?? "idle",
    error_code: null,
    error_message: null,
    video_url: null,
    thumbnail_url: null,
    video_plan: input.plan ?? null,
    analysis_result: input.analysis ?? null,
    progress: 0,
    created_at: now,
    updated_at: now,
  };
}
