/**
 * 商品分析の正規JSONスキーマ。
 * UI・API・将来のTikTok商品データ接続で共有する。
 * version "1.0" 履歴も読み込めるよう、新フィールドはすべて optional。
 */

export type ProductDataSource =
  | "manual"
  | "product_url"
  | "tiktok_shop"
  | "tiktok_affiliate";

/** 将来 TikTok Shop / Affiliate API から取り込む想定の商品スナップショット */
export type TikTokProductSnapshot = {
  productId: string | null;
  title: string | null;
  price: number | null;
  currency: string | null;
  commissionRate: number | null;
  salesCount: number | null;
  rating: number | null;
  shopName: string | null;
  category: string | null;
  productUrl: string | null;
  raw?: Record<string, unknown>;
};

export type SalesScoreBreakdown = {
  clarity: number;
  demandFit: number;
  differentiation: number;
  creativePotential: number;
  conversionReadiness: number;
};

export type SalesScore = {
  total: number;
  grade: "S" | "A" | "B" | "C" | "D";
  label: string;
  breakdown: SalesScoreBreakdown;
  tips: string[];
  /** 分析時点のベーススコア（実績反映前）。未設定時は total と同義 */
  baseTotal?: number;
  /** 分析時点の内訳（実績反映前） */
  baseBreakdown?: SalesScoreBreakdown;
  /** 実績による加点（0〜25） */
  performanceBonus?: number;
  /**
   * スコアの性質。
   * estimated = 商品情報ベースのAI推定（実測販売データなし）
   * measured = TikTok等の実績を含む
   */
  scoreKind?: "estimated" | "measured";
  /** UI向け短い注記（例: AI推定・参考スコア） */
  scoreNote?: string;
};

export type AnalyzeProductRequest = {
  product_name: string;
  /** 空可。未入力時はエンジン側で商品名を説明代わりに使う */
  description?: string;
  target: string;
  platform: string;
  product_url?: string | null;
  image_name?: string | null;
  /** 将来: TikTok商品IDを渡して外部データをマージ */
  tiktok_product_id?: string | null;
  source?: ProductDataSource;
  /** 実体験・レビュー本文がある場合のみ（任意） */
  review_text?: string | null;
};

export type BuyerPersonaDetail = {
  name: string;
  age: string;
  occupation: string;
  lifestyle: string;
  pain: string;
};

export type ProductAnalysis = {
  version: "1.0" | "1.1";
  analyzedAt: string;
  source: ProductDataSource;
  productName: string;
  summary: string;
  sellingPoints: string[];
  painPoints: string[];
  targetInsight: string;
  salesAngle: string;
  offerStyle: string;
  cta: string;
  buyerPersona: string;
  purchaseReasons: string[];
  differentiation: string[];
  recommendedVideoStructure: string[];
  ctaIdeas: string[];
  productUrl: string | null;
  hasImage: boolean;
  imageName: string | null;
  salesScore: SalesScore;
  /** TikTok接続時に埋まる。未接続時は null */
  tiktok: TikTokProductSnapshot | null;

  // --- v1.1 拡張（optional = 旧履歴互換） ---
  /** 入力ターゲット原文 */
  target?: string;
  platform?: string;
  category?: string;
  /** 商品説明から分解した特徴（事実寄り） */
  productFeatures?: string[];
  /** 顧客ベネフィット（推定含む） */
  customerBenefits?: string[];
  /** 想定される購買障壁 */
  objections?: string[];
  /** 推奨販売角度 */
  recommendedAngles?: string[];
  /** 推奨フック案 */
  recommendedHooks?: string[];
  /** 説明文に明示された事実 */
  factualClaims?: string[];
  /** AIが文脈から推測した内容 */
  inferredClaims?: string[];
  /** 不確実・断定できない点 */
  uncertainty?: string[];
  /** 構造化ペルソナ（入力ターゲット優先） */
  buyerPersonaDetail?: BuyerPersonaDetail;
  /** 実体験レビュー入力の有無 */
  hasUserReview?: boolean;
  analysisVersion?: string;
};

export type AnalyzeProductResponse = {
  analysis: ProductAnalysis;
  product_id?: string | null;
  save_warning?: string;
};
