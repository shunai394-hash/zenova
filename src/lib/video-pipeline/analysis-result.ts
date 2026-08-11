import type { ProductAnalysis } from "@/lib/product-analysis";
import { normalizeProductAnalysis } from "@/lib/product-analysis/engine";
import type { AiPlanBrief } from "@/lib/analyze/plan-brief";
import type { AnalysisResult } from "./types";

/**
 * ProductAnalysis + 企画書から AnalysisResult を構築。
 * 選択中の brief がある場合はそちらを優先（下流で再解釈しない）。
 */
export function buildAnalysisResult(input: {
  analysis: ProductAnalysis;
  brief?: AiPlanBrief | null;
  recommendedVideoType?: string | null;
  formTarget?: string;
}): AnalysisResult {
  const analysis = normalizeProductAnalysis(input.analysis);
  const { brief } = input;
  const score = analysis.salesScore?.total ?? 70;

  const targetAudience =
    brief?.target?.trim() ||
    input.formTarget?.trim() ||
    analysis.target?.trim() ||
    analysis.targetInsight?.trim() ||
    "購入検討者";

  const painPoints = splitList(brief?.painPoints, analysis.painPoints);

  const sellingPoints = (
    analysis.productFeatures?.length
      ? analysis.productFeatures
      : analysis.sellingPoints || []
  )
    .filter(Boolean)
    .slice(0, 6);

  const recommendedVideoType =
    input.recommendedVideoType?.trim() ||
    inferVideoType(analysis) ||
    "ugc";

  const hook =
    brief?.firstThreeSeconds?.trim() ||
    analysis.recommendedHooks?.[0] ||
    (painPoints[0] ? `${painPoints[0].replace(/。$/, "")}？` : "冒頭で特徴を見せる");

  const cta =
    brief?.cta?.trim() ||
    analysis.cta?.trim() ||
    analysis.ctaIdeas?.[0] ||
    "プロフィールのリンクからチェック";

  const videoStructure =
    parseStructureLines(brief?.structure) ||
    analysis.recommendedVideoStructure?.filter(Boolean) ||
    [
      "フック: 悩みを提示",
      "商品紹介",
      "特徴",
      "使用イメージ",
      "CTA",
    ];

  return {
    score,
    targetAudience,
    painPoints:
      painPoints.length > 0 ? painPoints : [`${targetAudience}の不便を具体化`],
    sellingPoints:
      sellingPoints.length > 0 ? sellingPoints : ["商品特徴の提示"],
    recommendedVideoType,
    hook,
    cta,
    videoStructure,
  };
}

/** ダミー AnalysisResult（UI / テスト用） */
export function createDummyAnalysisResult(
  overrides?: Partial<AnalysisResult>
): AnalysisResult {
  return {
    score: 75,
    targetAudience: "通勤する20代会社員",
    painPoints: ["夏の通勤で腕の日差しが気になる"],
    sellingPoints: ["ひんやり涼感", "UVカット", "薄手"],
    recommendedVideoType: "ugc",
    hook: "夏の通勤、腕の日差し対策してる？",
    cta: "プロフィールのリンクからチェック",
    videoStructure: [
      "フック",
      "悩み",
      "商品紹介",
      "特徴",
      "使用イメージ",
      "CTA",
    ],
    ...overrides,
  };
}

function splitList(
  briefText: string | null | undefined,
  fallback: string[] | null | undefined
): string[] {
  if (briefText?.trim()) {
    return briefText
      .split(/[\n、,・]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
  }
  return (fallback ?? []).filter(Boolean).slice(0, 6);
}

function parseStructureLines(
  structure: string | null | undefined
): string[] | null {
  if (!structure?.trim()) return null;
  const lines = structure
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : null;
}

function inferVideoType(analysis: ProductAnalysis): string {
  const angle = analysis.salesAngle || "";
  if (/比較|どっち|vs|選択/i.test(angle)) return "compare";
  if (/Before|After|変化|ビフォー/i.test(angle)) return "before_after";
  if (/ランキング|TOP|ポイント/i.test(angle)) return "ranking";
  if (/広告|ブランド/i.test(angle)) return "ad";
  return "ugc";
}
