/**
 * Zenova 動画生成パイプライン（共有型・ビルダー・プロバイダ抽象化）
 *
 * VideoProvider interface:
 *   generateVideo() / getStatus()
 *
 * VIDEO_PROVIDER=mock|kling|seedance|runway|sora|luma
 */

export type {
  ProductInput,
  ProductSource,
  AnalysisResult,
  VideoPlan,
  VideoPlanTimelineItem,
  VideoPlanGoal,
  VideoIdea,
  VideoResult,
  GenerationStatus,
  PipelineVideoProviderId,
} from "./types";

export {
  buildProductInput,
  productInputToApiFields,
} from "./product-input";

export {
  buildAnalysisResult,
  createDummyAnalysisResult,
} from "./analysis-result";

export {
  buildVideoPlan,
  buildVideoPlanFromIdea,
  createDummyVideoPlan,
  videoPlanToStructureText,
} from "./video-plan";

export {
  generateVideoIdeas,
  createDummyVideoIdeas,
  type VideoIdeaInput,
} from "./video-ideas";

export {
  buildVideoResult,
  videoResultToPreviewPayload,
  createDummyVideoResult,
} from "./video-result";

export {
  GENERATION_STATUS_LABELS,
  GENERATION_STATUS_FLOW,
  getGenerationStatusLabel,
  generationStatusIndex,
  resolveGenerationStatus,
  toPersistedVideoStatus,
  fromPersistedVideoStatus,
} from "./status";

export {
  PIPELINE_ERROR_MESSAGES,
  getPipelineErrorMessage,
  classifyPipelineError,
  validateBeforeGenerate,
  type PipelineErrorCode,
} from "./errors";

export {
  generateVideo,
  getVideoJobStatus,
  getVideoProvider,
  resolveVideoProviderId,
  getPipelineVideoProvider,
  resolvePipelineProviderId,
  type VideoProvider,
  type GenerateVideoParams,
  type GenerateVideoOutcome,
  type ProviderJobStatus,
  type GenerateVideoRequest,
  type GenerateVideoResponse,
  type PipelineVideoProvider,
} from "./video-provider";

export {
  createVideoJobDraft,
  providerStatusToJobPatch,
  generationStatusToLegacyDb,
  legacyDbToGenerationStatus,
  type VideoJobRecord,
  type LegacyGeneratedVideoStatus,
} from "./job-record";

export { PIPELINE_DB_TABLES } from "./schema";
