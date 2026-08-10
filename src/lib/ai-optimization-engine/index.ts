/**
 * AI動画改善ループエンジン
 *
 * feedback.ts   — 投稿結果の振り返り
 * learning.ts   — 改善履歴（previous/after score）
 * next-video.ts — 次の動画3案
 * provider.ts   — AI_OPTIMIZATION_PROVIDER=mock|openai
 */

export type {
  AiOptimizationProviderId,
  VideoLoopStatus,
  PostPlatform,
  PostResultMetrics,
  OptimizationReflection,
  ImprovementRecord,
  NextVideoIdea,
  AnalyzePostFeedbackInput,
  GenerateNextVideosInput,
} from "./types";

export {
  resolveAiOptimizationProviderId,
  getAiOptimizationProviderLabel,
} from "./provider";

export {
  analyzePostFeedback,
  analyzePostFeedbackMock,
  engagementRate,
  saveRate,
  commentRate,
} from "./feedback";

export {
  buildImprovementRecord,
  buildImprovementRecordMock,
  estimateAfterScore,
  type BuildImprovementInput,
} from "./learning";

export {
  generateNextVideoIdeas,
  generateNextVideoIdeasMock,
} from "./next-video";
