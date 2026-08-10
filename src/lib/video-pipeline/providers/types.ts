/**
 * VideoProvider — 映像生成 AI の差し替え用 interface
 *
 * VIDEO_PROVIDER=mock|kling|seedance|runway|sora|luma
 * で実装を切り替え。各モデルは generateVideo / getStatus を実装する。
 */

import type {
  AnalysisResult,
  GenerationStatus,
  PipelineVideoProviderId,
  ProductInput,
  VideoPlan,
  VideoResult,
} from "../types";

/** @deprecated 互換 alias — VideoProviderId を使用 */
export type VideoProviderId = PipelineVideoProviderId;

export type GenerateVideoParams = {
  product: ProductInput;
  plan: VideoPlan;
  analysis?: AnalysisResult | null;
  /** 商品画像 base64（image-to-video 系で必須） */
  imageBase64?: string | null;
  /** 呼び出し側ジョブ ID（DB 保存用）。未指定時は provider が採番 */
  jobId?: string | null;
  /** モック遅延など provider 固有オプション */
  options?: Record<string, unknown>;
};

export type GenerateVideoOutcome = {
  ok: boolean;
  /** 同期完了時に埋まる。非同期開始のみなら null */
  result: VideoResult | null;
  provider: VideoProviderId;
  /** provider / 内部ジョブ ID（getStatus・DB 用） */
  jobId: string;
  /** 開始直後のパイプライン状態 */
  status: GenerationStatus;
  error?: string | null;
  errorCode?: string | null;
};

/**
 * getStatus の戻り値 — DB の pipeline_status / provider_job_id と対応
 */
export type ProviderJobStatus = {
  jobId: string;
  provider: VideoProviderId;
  /** Zenova パイプライン状態（DB 保存対象） */
  status: GenerationStatus;
  /** provider 生ステータス（queued / running / succeeded 等） */
  providerStatus?: string | null;
  progress?: number | null;
  result?: VideoResult | null;
  error?: string | null;
  errorCode?: string | null;
  updatedAt: string;
};

/**
 * 各 AI モデルが実装する契約
 *
 * @example
 * class SeedanceProvider implements VideoProvider {
 *   readonly id = "seedance";
 *   async generateVideo(params) { ... }
 *   async getStatus(jobId) { ... }
 * }
 */
export interface VideoProvider {
  readonly id: VideoProviderId;
  generateVideo(params: GenerateVideoParams): Promise<GenerateVideoOutcome>;
  getStatus(jobId: string): Promise<ProviderJobStatus>;
}

/** 互換: 旧 PipelineVideoProvider 名 */
export type PipelineVideoProvider = VideoProvider;
