/**
 * 改善学習・履歴レコード生成
 */

import type {
  ImprovementRecord,
  OptimizationReflection,
  PostResultMetrics,
} from "./types";
import { engagementRate } from "./feedback";
import { resolveAiOptimizationProviderId } from "./provider";

export type BuildImprovementInput = {
  previousScore?: number | null;
  metrics: PostResultMetrics;
  reflection: OptimizationReflection;
  nextIdeasSummary?: string | null;
};

/**
 * 投稿結果から after_score を推定（0–100）
 */
export function estimateAfterScore(
  metrics: PostResultMetrics,
  previousScore?: number | null
): number {
  const eng = engagementRate(metrics);
  const save = metrics.views > 0 ? metrics.saves / metrics.views : 0;
  const clickBonus =
    metrics.clicks != null && metrics.views > 0
      ? Math.min(15, (metrics.clicks / metrics.views) * 400)
      : 0;
  const purchaseBonus =
    metrics.purchases != null && metrics.views > 0
      ? Math.min(20, (metrics.purchases / metrics.views) * 800)
      : 0;

  let score =
    Math.min(40, Math.log10(Math.max(1, metrics.views)) * 12) +
    Math.min(30, eng * 250) +
    Math.min(15, save * 300) +
    clickBonus +
    purchaseBonus;

  const prev =
    typeof previousScore === "number" && !Number.isNaN(previousScore)
      ? previousScore
      : 70;
  // 前回スコアと実績をブレンド
  score = score * 0.65 + prev * 0.35;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildImprovementRecordMock(
  input: BuildImprovementInput
): ImprovementRecord {
  const previous =
    typeof input.previousScore === "number" && !Number.isNaN(input.previousScore)
      ? Math.round(input.previousScore)
      : 70;
  const after = estimateAfterScore(input.metrics, previous);
  const topImprove =
    input.reflection.improvements[0]?.replace(/^・/, "") ||
    "構成とCTAの見直し";
  const topNext =
    input.reflection.nextSuggestions[0]
      ?.replace(/^[①②③]\s*/, "")
      .trim() || "冒頭を変更";

  const nextPlan =
    input.nextIdeasSummary?.trim() ||
    `次回は「${topNext}」を軸に、別フック・別ターゲット・別構成の3案で検証する`;

  return {
    previous_score: previous,
    after_score: after,
    improvement_reason: topImprove,
    next_video_plan: nextPlan,
  };
}

/**
 * 改善履歴レコードを生成（動画ごとに保存用）
 */
export function buildImprovementRecord(
  input: BuildImprovementInput
): ImprovementRecord {
  const provider = resolveAiOptimizationProviderId();
  if (provider === "openai") {
    console.info(
      "[ai-optimization-engine] learning: openai 未接続のため mock を使用"
    );
  }
  return buildImprovementRecordMock(input);
}

export { buildImprovementRecordMock };
