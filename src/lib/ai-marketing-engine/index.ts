/**
 * AIマーケティング診断エンジン（投稿前チェック）
 *
 * analysis.ts       — 診断エントリ
 * score.ts          — 5項目スコア
 * recommendation.ts — 改善優先度・投稿シミュレーション
 * provider.ts       — AI_MARKETING_PROVIDER=mock|openai
 * openai/stubs.ts   — OpenAI 差し替え用スタブ
 */

export type {
  AiMarketingProviderId,
  MarketingCriterionId,
  MarketingStarRating,
  MarketingPriorityItem,
  PostSimulationForecast,
  MarketingCheckReport,
  MarketingCheckInput,
} from "./types";

export {
  resolveAiMarketingProviderId,
  getAiMarketingProviderLabel,
} from "./provider";

export {
  scoreMarketingCriteria,
  toStarRatings,
  computeSalesPowerScore,
  type CriterionScores,
} from "./score";

export {
  buildImprovementPriorities,
  buildScoreReasons,
  buildPostSimulation,
  buildAiFeedbackSummary,
} from "./recommendation";

export {
  runMarketingCheck,
  runMarketingCheckMock,
} from "./analysis";
