import type { AiPlanBrief } from "@/lib/analyze/plan-brief";
import type { ProductAnalysis } from "@/lib/product-analysis";
import type { VideoSettings } from "@/lib/analyze/video-settings";
import { getVideoStyleLabel, getSpeakerLabel } from "@/lib/analyze/video-settings";

/**
 * AI分析結果を、ユーザー向けの文章説明に変換する。
 */
export function buildAnalysisNarrative(input: {
  analysis: ProductAnalysis;
  brief?: AiPlanBrief | null;
  settings?: VideoSettings | null;
}): string {
  const { analysis, brief, settings } = input;
  const product = analysis.productName || "この商品";
  const score = analysis.salesScore;
  const target =
    brief?.target?.trim() ||
    analysis.targetInsight?.trim() ||
    analysis.buyerPersona?.trim() ||
    "幅広い層";
  const pain =
    brief?.painPoints
      ?.split("\n")
      .map((l) => l.trim())
      .filter(Boolean)[0] ||
    analysis.painPoints?.[0] ||
    "購買前の不安";
  const angle = analysis.salesAngle?.trim() || "ベネフィット訴求";
  const hook =
    brief?.firstThreeSeconds?.trim() ||
    analysis.recommendedVideoStructure?.[0] ||
    "冒頭3秒のフック";
  const style = settings
    ? getVideoStyleLabel(settings.video_style)
    : "UGC";
  const duration = settings?.duration_sec ?? 15;
  const speaker = settings
    ? getSpeakerLabel(settings.speaker)
    : "女性";

  const paragraphs = [
    `AIは「${product}」を分析し、販売スコア ${score.total}/100（Grade ${score.grade}・${score.label}）と判断しました。`,
    `想定ターゲットは「${target}」です。特に「${pain}」という悩みに刺さるため、${angle}の切り口が有効です。`,
    `動画は約${duration}秒・${style}スタイル・${speaker}ナレーションを推奨します。最初の3秒では「${hook}」でスクロールを止め、本編で価値を示し、最後に明確なCTAで行動を促す構成です。`,
    analysis.summary?.trim()
      ? `補足: ${analysis.summary.trim()}`
      : "",
  ].filter(Boolean);

  return paragraphs.join("\n\n");
}
