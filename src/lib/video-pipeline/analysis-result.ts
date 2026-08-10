import type { ProductAnalysis } from "@/lib/product-analysis";
import type { AiPlanBrief } from "@/lib/analyze/plan-brief";
import type { AnalysisResult } from "./types";

/**
 * ProductAnalysis + 企画書から AnalysisResult を構築。
 * ダミーでもこの型を通すことで、後から AI API 差し替えが容易。
 */
export function buildAnalysisResult(input: {
  analysis: ProductAnalysis;
  brief?: AiPlanBrief | null;
  recommendedVideoType?: string | null;
  formTarget?: string;
}): AnalysisResult {
  const { analysis, brief } = input;
  const score = analysis.salesScore?.total ?? 70;

  const targetAudience =
    brief?.target?.trim() ||
    analysis.targetInsight?.trim() ||
    input.formTarget?.trim() ||
    analysis.buyerPersona?.trim() ||
    "20〜40代女性";

  const painPoints = splitList(
    brief?.painPoints,
    analysis.painPoints
  );

  const sellingPoints =
    analysis.sellingPoints?.filter(Boolean).slice(0, 6) ?? [];

  const recommendedVideoType =
    input.recommendedVideoType?.trim() ||
    inferVideoType(analysis) ||
    "ugc";

  const hook =
    brief?.firstThreeSeconds?.trim() ||
    analysis.recommendedVideoStructure?.[0] ||
    "知らないと損するかも";

  const cta =
    brief?.cta?.trim() ||
    analysis.cta?.trim() ||
    analysis.ctaIdeas?.[0] ||
    "プロフィールのリンクからチェック";

  const videoStructure =
    parseStructureLines(brief?.structure) ||
    analysis.recommendedVideoStructure?.filter(Boolean) ||
    [
      "0-3秒: 問題提起で止める",
      "3-10秒: 商品の特徴を見せる",
      "10-15秒: CTAで行動を促す",
    ];

  return {
    score,
    targetAudience,
    painPoints:
      painPoints.length > 0
        ? painPoints
        : ["効果が分からない", "どれを選べばいいか迷う"],
    sellingPoints:
      sellingPoints.length > 0
        ? sellingPoints
        : ["使いやすい", "コスパが良い", "見た目で伝わる"],
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
    score: 85,
    targetAudience: "20〜40代女性",
    painPoints: ["効果が分からない", "続けられるか不安"],
    sellingPoints: ["使用前後比較ができる", "悩み解決型に向いている"],
    recommendedVideoType: "before_after",
    hook: "知らないと損。これ、最初の3秒だけ見て",
    cta: "気になった人はプロフィールのリンクからチェック",
    videoStructure: [
      "0-3秒: 問題提起",
      "3-10秒: Before After",
      "10-15秒: CTA",
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
  if (/比較|どっち|vs/i.test(angle)) return "compare";
  if (/Before|After|変化|ビフォー/i.test(angle)) return "before_after";
  if (/ランキング|TOP/i.test(angle)) return "ranking";
  if (/広告|ブランド/i.test(angle)) return "ad";
  return "ugc";
}
