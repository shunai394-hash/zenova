/**
 * 商品分析の正規JSONスキーマ。
 * UI・API・将来のTikTok商品データ接続で共有する。
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
};

export type AnalyzeProductRequest = {
  product_name: string;
  description: string;
  target: string;
  platform: string;
  product_url?: string | null;
  image_name?: string | null;
  /** 将来: TikTok商品IDを渡して外部データをマージ */
  tiktok_product_id?: string | null;
  source?: ProductDataSource;
};

export type ProductAnalysis = {
  version: "1.0";
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
};

export type AnalyzeProductResponse = {
  analysis: ProductAnalysis;
  product_id?: string | null;
  save_warning?: string;
};
