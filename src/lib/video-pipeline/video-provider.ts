/**
 * 映像生成プロバイダ — 公開ファサード
 *
 * interface VideoProvider {
 *   generateVideo()
 *   getStatus()
 * }
 *
 * VIDEO_PROVIDER=mock|kling|seedance|runway|sora|luma
 */

import type { PipelineVideoProviderId } from "./types";
import {
  getVideoProvider,
  resolveVideoProviderId,
  type GenerateVideoOutcome,
  type GenerateVideoParams,
  type ProviderJobStatus,
  type VideoProvider,
} from "./providers";
import type { AnalysisResult, ProductInput, VideoPlan } from "./types";

export type {
  VideoProvider,
  GenerateVideoParams,
  GenerateVideoOutcome,
  ProviderJobStatus,
} from "./providers";

export {
  getVideoProvider,
  resolveVideoProviderId,
  getPipelineVideoProvider,
  resolvePipelineProviderId,
} from "./providers";

/** @deprecated 旧リクエスト形（互換） */
export type GenerateVideoRequest = {
  product: ProductInput;
  plan: VideoPlan;
  analysis?: AnalysisResult | null;
  imageBase64?: string | null;
  provider?: PipelineVideoProviderId | null;
  mockDelayMs?: number;
  jobId?: string | null;
};

/** @deprecated 旧レスポンス形（互換） */
export type GenerateVideoResponse = {
  ok: boolean;
  result: GenerateVideoOutcome["result"];
  provider: PipelineVideoProviderId;
  error?: string | null;
  jobId?: string | null;
  status?: GenerateVideoOutcome["status"];
  errorCode?: string | null;
};

/** @deprecated */
export type PipelineVideoProvider = VideoProvider;

/**
 * 高レベル API — 環境変数 VIDEO_PROVIDER で実装を選択
 *
 * @example
 * await generateVideo({ product, plan, provider: "mock" })
 * await getVideoJobStatus(jobId)
 */
export async function generateVideo(
  req: GenerateVideoRequest
): Promise<GenerateVideoResponse> {
  const provider = getVideoProvider(req.provider);
  const outcome = await provider.generateVideo({
    product: req.product,
    plan: req.plan,
    analysis: req.analysis,
    imageBase64: req.imageBase64,
    jobId: req.jobId,
    options:
      req.mockDelayMs != null ? { mockDelayMs: req.mockDelayMs } : undefined,
  });

  return {
    ok: outcome.ok,
    result: outcome.result,
    provider: outcome.provider,
    error: outcome.error,
    jobId: outcome.jobId,
    status: outcome.status,
    errorCode: outcome.errorCode,
  };
}

/** ジョブ状態照会（非同期生成・DB 同期用） */
export async function getVideoJobStatus(
  jobId: string,
  providerId?: string | null
): Promise<ProviderJobStatus> {
  const provider = getVideoProvider(providerId);
  return provider.getStatus(jobId);
}
