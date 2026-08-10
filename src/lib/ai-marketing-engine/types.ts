/**
 * AIマーケティング診断エンジン — 共有型
 * OpenAI 差し替え時もこの型を維持する。
 */

export type AiMarketingProviderId = "mock" | "openai";

export type MarketingCriterionId =
  | "hook"
  | "product_clarity"
  | "trust"
  | "conversion"
  | "tiktok_fit";

export type MarketingStarRating = {
  id: MarketingCriterionId;
  label: string;
  /** 1–5 */
  stars: number;
  description: string;
};

export type MarketingPriorityItem = {
  rank: number;
  title: string;
  reason: string;
};

export type PostSimulationForecast = {
  audience: string;
  saveLikelihood: number;
  commentLikelihood: number;
  purchaseLikelihood: number;
  /** 実測ではなくAI予測である旨 */
  disclaimer: string;
};

export type MarketingCheckReport = {
  /** 動画販売力スコア 0–100 */
  salesPowerScore: number;
  /** 総合評価の理由 */
  scoreReasons: string[];
  criteria: MarketingStarRating[];
  priorities: MarketingPriorityItem[];
  simulation: PostSimulationForecast;
  /** history 保存用サマリ */
  aiFeedback: string;
  /** history 用 */
  hookScore: number;
  conversionScore: number;
  checkedAt: string;
};

export type MarketingCheckInput = {
  productName?: string | null;
  hook?: string | null;
  cta?: string | null;
  structure?: string | null;
  style?: string | null;
  durationSec?: number | null;
  isVertical?: boolean | null;
  captionsEnabled?: boolean | null;
  sellingAngle?: string | null;
  targetAudience?: string | null;
  whoFor?: string | null;
  target?: string | null;
  problem?: string | null;
  solution?: string | null;
  goal?: string | null;
  baseScore?: number | null;
  productDescription?: string | null;
};
