/**
 * AI販売企画エンジン — 共有型
 * OpenAI 等への差し替え時もこの型を維持する。
 */

export type AiSalesProviderId = "mock" | "openai";

export type SalesGoal = "purchase" | "affiliate_click" | "brand_awareness";

export type SalesPlatformHint = "amazon" | "rakuten" | "tiktok_shop" | "other";

/** ターゲット人物像 */
export type BuyerPersonaProfile = {
  name: string;
  age: string;
  lifestyle: string;
  pain: string;
};

export type ProductUnderstanding = {
  category: string;
  buyers: string[];
  purchaseReasons: string[];
  /** 解決する悩み */
  painPoints: string[];
  differentiators: string[];
  /** 販売角度（誰にどう売るか） */
  salesAngles: string[];
  /** 代表的な人物像 */
  persona: BuyerPersonaProfile;
};

export type TikTokSalesAnalysis = {
  hookPowerStars: number; // 1–5
  emotionTriggers: string[];
  openingHooks: string[];
};

/** AI販売スコア（動画適性） */
export type SalesVideoScore = {
  /** 販売動画適性 ★1–5 */
  suitabilityStars: number;
  /** 動画化おすすめ度 0–100 */
  videoReadyScore: number;
  /** 適性の理由 */
  reasons: string[];
};

export type SalesBrief = {
  score: number;
  scoreLabel: string;
  targetAudience: string;
  sellPoints: string[];
  recommendedFormat: string;
  recommendedFormatLabel: string;
  reason: string;
  productUnderstanding: ProductUnderstanding;
  tiktok: TikTokSalesAnalysis;
  videoScore: SalesVideoScore;
};

export type SalesIdeaKind = "pain_solve" | "viral_intro" | "review_trust";

export type SalesVideoIdea = {
  id: string;
  kind: SalesIdeaKind;
  title: string;
  /** 表示用ターゲット（例: 20代女性） */
  target: string;
  concept: string;
  targetAudience: string;
  whoFor: string;
  hook: string;
  problem: string;
  solution: string;
  videoStyle: string;
  timeline: { second: string; scene: string; text: string }[];
  cta: string;
  reason: string;
  goal: SalesGoal;
  icon?: string;
  feature?: string;
  suitableProducts?: string;
};

export type VideoOptimizationItem = {
  id: "hook" | "presentation" | "cta" | "duration" | "target";
  label: string;
  before: string;
  after: string;
  tip: string;
};

export type VideoOptimizationResult = {
  summary: string;
  items: VideoOptimizationItem[];
};

/** Preview「この動画が狙っていること」 */
export type VideoIntentBrief = {
  purpose: string;
  audience: string;
  emotions: string[];
  purchasePath: string;
};
