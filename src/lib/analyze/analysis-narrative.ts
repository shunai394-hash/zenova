import type { AiPlanBrief } from "@/lib/analyze/plan-brief";
import type { ProductAnalysis } from "@/lib/product-analysis";
import { normalizeProductAnalysis } from "@/lib/product-analysis/engine";
import type { VideoSettings } from "@/lib/analyze/video-settings";
import { getVideoStyleLabel, getSpeakerLabel } from "@/lib/analyze/video-settings";

/**
 * AI分析結果を、ユーザー向けの文章説明に変換する（重複なし）。
 */
export function buildAnalysisNarrative(input: {
  analysis: ProductAnalysis;
  brief?: AiPlanBrief | null;
  settings?: VideoSettings | null;
}): string {
  const analysis = normalizeProductAnalysis(input.analysis);
  const { brief, settings } = input;
  const product = analysis.productName || "この商品";
  const score = analysis.salesScore;
  const target =
    brief?.target?.trim() ||
    analysis.target?.trim() ||
    "入力ターゲット";
  const pain =
    brief?.painPoints
      ?.split("\n")
      .map((l) => l.trim())
      .filter(Boolean)[0] ||
    analysis.painPoints?.[0] ||
    "購買前の不安";
  const features = (analysis.productFeatures || []).slice(0, 3).join(" / ");
  const hook =
    brief?.firstThreeSeconds?.trim() ||
    analysis.recommendedHooks?.[0] ||
    "冒頭で場面と悩みを提示";
  const style = settings
    ? getVideoStyleLabel(settings.video_style)
    : "UGC紹介";
  const duration = settings?.duration_sec ?? 15;
  const speaker = settings ? getSpeakerLabel(settings.speaker) : "女性";
  const uncertainty =
    analysis.uncertainty?.[0] ||
    "効果の強さなど、商品説明にない点は断定しません";

  const paragraphs = [
    `なぜこのターゲットか: 入力「${target}」を優先し、矛盾する属性へ置き換えていません。`,
    `なぜこの訴求か: 商品情報から分解した特徴（${features || "特徴抽出中"}）と、悩み「${pain}」を結び付けています。`,
    `なぜこの形式・尺か: 約${duration}秒・${style}・${speaker}ナレーションで、フック「${hook}」→特徴→CTAの流れにしています。`,
    `スコア: ${score.total}/100（Grade ${score.grade}）は${score.scoreNote || "AI推定・参考スコア"}です。`,
    `不確実な点: ${uncertainty}`,
  ];

  return paragraphs.join("\n\n");
}
