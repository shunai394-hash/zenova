/**
 * AI動画改善ループエンジン — 共有型
 */

export type AiOptimizationProviderId = "mock" | "openai";

/** 運用ライフサイクル（投稿状態） */
export type VideoLoopStatus =
  | "created"
  | "scheduled"
  | "posted"
  | "improving";

export type PostPlatform = "tiktok" | "youtube_shorts" | "instagram_reels";

export type PostResultMetrics = {
  platform: PostPlatform;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  clicks?: number | null;
  purchases?: number | null;
};

export type OptimizationReflection = {
  strengths: string[];
  improvements: string[];
  nextSuggestions: string[];
  summary: string;
};

/** 動画ごとの改善履歴 */
export type ImprovementRecord = {
  previous_score: number;
  after_score: number;
  improvement_reason: string;
  next_video_plan: string;
};

export type NextVideoIdea = {
  id: string;
  title: string;
  focus: "hook" | "target" | "structure";
  focusLabel: string;
  hook: string;
  target: string;
  structure: string[];
  reason: string;
};

export type AnalyzePostFeedbackInput = {
  productName?: string | null;
  hook?: string | null;
  style?: string | null;
  target?: string | null;
  previousScore?: number | null;
  metrics: PostResultMetrics;
};

export type GenerateNextVideosInput = {
  productName: string;
  productId?: string | null;
  hook?: string | null;
  target?: string | null;
  style?: string | null;
  reflection?: OptimizationReflection | null;
  metrics?: PostResultMetrics | null;
};
