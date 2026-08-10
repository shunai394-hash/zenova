/**
 * Zenova 動画生成パイプライン — 共有データ型
 *
 * UI (analyze / preview) と API (/api/create-sales-video) が同じ型を使う。
 * Amazon / 楽天 / TikTok Shop など複数ソースは ProductSource で拡張する。
 */

/** 商品データの取得元（今後ソース追加） */
export type ProductSource =
  | "manual"
  | "url"
  | "image"
  | "amazon"
  | "rakuten"
  | "tiktok_shop"
  | "tiktok_affiliate"
  | "discovery";

/**
 * 統一商品入力
 * URL / 画像 / 手動入力をこの型に正規化する。
 */
export type ProductInput = {
  id: string | null;
  name: string;
  image: string | null;
  url: string | null;
  description: string;
  category: string | null;
  target: string;
  selling_points: string[];
  /** 入力経路（将来のソース別パーサー用） */
  source?: ProductSource;
  /**
   * 商品ページ URL（Amazon / 楽天 / TikTok Shop 等）
   * url と同値でも可。将来のクローラ用に明示保持。
   */
  sourceUrl?: string | null;
  /** amazon | rakuten | tiktok_shop | other 等 */
  platform?: string | null;
};

/**
 * /analyze で使う AI 分析結果
 * ProductAnalysis から変換可能。後で専用 API に差し替え可。
 */
export type AnalysisResult = {
  score: number;
  targetAudience: string;
  painPoints: string[];
  sellingPoints: string[];
  recommendedVideoType: string;
  hook: string;
  cta: string;
  videoStructure: string[];
};

/** タイムライン1シーン */
export type VideoPlanTimelineItem = {
  second: string;
  scene: string;
  text: string;
};

/** 販売目的（VideoPlan / 生成 API へ渡す） */
export type VideoPlanGoal =
  | "purchase"
  | "affiliate_click"
  | "brand_awareness";

/**
 * 動画企画（analyze → generate → preview で共有）
 */
export type VideoPlan = {
  title: string;
  style: string;
  duration: number;
  timeline: VideoPlanTimelineItem[];
  /** 元になった VideoIdea id（任意） */
  ideaId?: string | null;
  /** 販売目的 */
  goal?: VideoPlanGoal | null;
  /** 行動誘導文 */
  cta?: string | null;
};

/**
 * AI販売企画エンジンが提案する動画アイデア（3案から選択）
 * 後で AI API 接続時も同じ型を使う。
 */
export type VideoIdea = {
  id: string;
  title: string;
  concept: string;
  targetAudience: string;
  hook: string;
  videoStyle: string;
  timeline: VideoPlanTimelineItem[];
  cta: string;
  reason: string;
  /** UI用アイコン（絵文字） */
  icon?: string;
  /** 特徴の短い説明 */
  feature?: string;
  /** 向いている商品カテゴリ表示 */
  suitableProducts?: string;
  /** 誰向け */
  whoFor?: string;
  /** 販売目的 */
  goal?: VideoPlanGoal | null;
  /** 表示用ターゲット（例: 20代女性） */
  target?: string;
  /** 提示する悩み */
  problem?: string;
  /** 商品による解決 */
  solution?: string;
};

/**
 * 生成結果（preview へ渡す）
 */
export type VideoResult = {
  videoUrl: string;
  thumbnail: string | null;
  duration: number;
  score: number;
  caption: string;
  videoId?: string | null;
  productId?: string | null;
  provider?: string | null;
};

/**
 * パイプライン生成状態
 */
export type GenerationStatus =
  | "idle"
  | "analyzing"
  | "planning"
  | "generating"
  | "completed"
  | "failed";

/** 将来差し替え可能な映像プロバイダ ID（VIDEO_PROVIDER と一致） */
export type PipelineVideoProviderId =
  | "mock"
  | "kling"
  | "luma"
  | "seedance"
  | "runway"
  | "sora";

/** 推奨 alias */
export type VideoProviderId = PipelineVideoProviderId;
