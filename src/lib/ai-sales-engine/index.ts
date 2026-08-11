/**
 * AI販売企画エンジン
 *
 * analysis.ts      — 商品分析（販売企画書）
 * ideas.ts         — 動画企画3案
 * optimization.ts  — Preview 改善 / 狙い
 * provider.ts      — AI_PROVIDER=mock|openai
 * openai/stubs.ts  — OpenAI 差し替え用スタブ
 */

export type {
  AiSalesProviderId,
  SalesGoal,
  SalesPlatformHint,
  BuyerPersonaProfile,
  ProductUnderstanding,
  TikTokSalesAnalysis,
  SalesVideoScore,
  SalesBrief,
  SalesIdeaKind,
  SalesVideoIdea,
  VideoOptimizationItem,
  VideoOptimizationResult,
  VideoIntentBrief,
} from "./types";

export {
  resolveAiSalesProviderId,
  getAiSalesProviderLabel,
} from "./provider";

export {
  analyzeSalesProduct,
  analyzeSalesProductMock,
  type AnalyzeSalesProductInput,
} from "./analysis";

export {
  generateSalesVideoIdeas,
  generateSalesVideoIdeasMock,
  generateSalesVideoIdeasAsync,
  generateSalesVideoIdeasWithGroq,
  type GenerateSalesIdeasInput,
} from "./ideas";

export {
  optimizeSalesVideo,
  buildVideoIntentBrief,
  type OptimizeVideoInput,
  type BuildVideoIntentInput,
} from "./optimization";
