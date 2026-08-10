export {
  aggregatePatternInsights,
  computeConversionRate,
  computeCtr,
  computeEngagementRate,
  scoreVideoPerformance,
  templateBonusFromInsights,
} from "./scoring";
export {
  formatInsightsForPrompt,
  getVideoPerformanceById,
  getWinningPatternPromptBlock,
  listVideoPerformance,
  listWinningPatterns,
  normalizeMetrics,
  saveVideoPerformance,
} from "./repository";
export {
  emptyTikTokVideoSnapshot,
  fetchTikTokVideoSnapshot,
} from "./tiktok-source";
export type {
  HookType,
  SaveVideoPerformanceInput,
  TikTokVideoSnapshot,
  VideoIntelligenceScore,
  VideoIntelligenceSource,
  VideoPatternInsight,
  VideoPerformanceMetrics,
  VideoPerformanceRecord,
} from "./types";
