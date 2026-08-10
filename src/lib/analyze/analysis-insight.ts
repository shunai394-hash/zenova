import type { ProductAnalysis } from "@/lib/product-analysis";
import type { AnalysisResult } from "@/lib/video-pipeline";
import { buildAnalysisResult } from "@/lib/video-pipeline";
import {
  analyzeSalesProduct,
  type SalesBrief,
} from "@/lib/ai-sales-engine";
import type { VideoStyleId } from "@/lib/analyze/video-settings";
import {
  getVideoStyleLabel,
  normalizeVideoStyleId,
} from "@/lib/analyze/video-settings";

/**
 * Analyze 用の強化分析カード（販売企画書）
 */
export type AnalysisInsightCard = {
  sellScore: number;
  sellScoreLabel: string;
  target: string;
  sellPoints: string[];
  recommendedFormat: VideoStyleId;
  recommendedFormatLabel: string;
  reason: string;
  analysisResult: AnalysisResult;
  /** 販売企画書の詳細 */
  salesBrief: SalesBrief;
};

export function buildAnalysisInsightCard(input: {
  analysis: ProductAnalysis;
  recommendedStyle?: VideoStyleId | null;
  formTarget?: string;
  category?: string | null;
  productName?: string;
  description?: string;
}): AnalysisInsightCard {
  const recommendedFormat =
    normalizeVideoStyleId(input.recommendedStyle) ||
    normalizeVideoStyleId(inferStyleFromAngle(input.analysis.salesAngle)) ||
    "ugc";

  const analysisResult = buildAnalysisResult({
    analysis: input.analysis,
    recommendedVideoType: recommendedFormat,
    formTarget: input.formTarget,
  });

  const salesBrief = analyzeSalesProduct({
    productName:
      input.productName || input.analysis.productName || "この商品",
    description: input.description || input.analysis.summary,
    category: input.category,
    target: input.formTarget || analysisResult.targetAudience,
    analysis: input.analysis,
    recommendedFormat,
    recommendedFormatLabel: getVideoStyleLabel(recommendedFormat),
  });

  return {
    sellScore: salesBrief.score,
    sellScoreLabel: salesBrief.scoreLabel,
    target: salesBrief.targetAudience,
    sellPoints: salesBrief.sellPoints,
    recommendedFormat,
    recommendedFormatLabel: salesBrief.recommendedFormatLabel,
    reason: salesBrief.reason,
    analysisResult,
    salesBrief,
  };
}

function inferStyleFromAngle(angle: string | null | undefined): string {
  const a = angle || "";
  if (/比較|どっち|vs/i.test(a)) return "compare";
  if (/Before|After|変化|ビフォー/i.test(a)) return "before_after";
  if (/ランキング|TOP/i.test(a)) return "ranking";
  if (/広告|ブランド/i.test(a)) return "ad";
  return "ugc";
}
