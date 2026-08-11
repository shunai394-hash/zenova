export { analyzeProduct, analyzeProductHeuristic, buildApiProductName, buildApiTarget, normalizeProductAnalysis, extractProductFeatures } from "./engine";
export {
  applyFactualGate,
  getClaimBucketsFromAnalysis,
  sanitizeIdeaText,
} from "./factual-gate";
export {
  buildClaimBuckets,
  expandExcludedClaims,
  extractConfirmedFeatures,
  extractExcludedFeatures,
  hasUnconfirmedProductAssertion,
} from "./claim-guard";
export {
  buildConfirmedPromptBlock,
  buildFallbackScenarioFromConfirmed,
  validateKlingPromptClaims,
  validateNarrationScript,
  validateOptimizeClaims,
  validateSalesScenarioClaims,
  validateVideoClaimText,
  validateVideoClaims,
  validateVideoPlanClaims,
} from "./validate-video-claims";export {
  applyPerformanceToSalesScore,
  computePerformanceBonus,
  getPerformanceByProductId,
  listPerformanceByProductIds,
  normalizePerformanceMetrics,
  upsertProductPerformance,
} from "./performance";
export {
  getProductById,
  getProductRanking,
  inferProductCategory,
  isProductAnalysis,
  listProductsBySalesScore,
  listRecentProducts,
  saveProductAnalysis,
} from "./repository";
export {
  emptyTikTokSnapshot,
  fetchTikTokProductSnapshot,
} from "./tiktok-source";
export type {
  PerformanceAdjustedScore,
  ProductPerformanceMetrics,
  ProductPerformanceRecord,
  UpsertProductPerformanceInput,
} from "./performance-types";
export type {
  ProductListItem,
  ProductRecord,
  SaveProductInput,
} from "./product-record";
export type {
  CategoryStat,
  ProductRankingPayload,
  RankingProduct,
  SalesAngleStat,
} from "./ranking-types";
export type {
  AnalyzeProductRequest,
  AnalyzeProductResponse,
  BuyerPersonaDetail,
  ProductAnalysis,
  ProductDataSource,
  SalesScore,
  SalesScoreBreakdown,
  TikTokProductSnapshot,
} from "./types";
