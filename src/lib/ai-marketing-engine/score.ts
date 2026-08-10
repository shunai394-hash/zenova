/**
 * 5項目スコア算出（ルールベース）
 */

import type {
  MarketingCheckInput,
  MarketingStarRating,
} from "./types";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function starsFromScore(score: number): number {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

export type CriterionScores = {
  hook: number;
  productClarity: number;
  trust: number;
  conversion: number;
  tiktokFit: number;
};

export function scoreMarketingCriteria(
  input: MarketingCheckInput
): CriterionScores {
  const hook = (input.hook || "").trim();
  const cta = (input.cta || "").trim();
  const structure = (input.structure || "").trim();
  const duration = input.durationSec ?? 30;
  const base = typeof input.baseScore === "number" ? input.baseScore : 70;
  const beats = structure.split("\n").filter(Boolean).length;
  const ideaProblem = (input.problem || "").trim();
  const ideaSolution = (input.solution || "").trim();
  const angle = (input.sellingAngle || "").trim();
  const desc = (input.productDescription || "").trim();

  let hookScore = 40;
  if (hook.length >= 8) hookScore += 15;
  if (hook.length >= 18) hookScore += 8;
  if (/[？?]/.test(hook) || /知らない|正直|損|これ/.test(hook)) hookScore += 18;
  if (/商品|紹介|スペック/.test(hook) && !/[？?]/.test(hook)) hookScore -= 12;
  hookScore = clamp(hookScore * 0.55 + base * 0.45);

  let productClarity = 42;
  if (ideaSolution || angle) productClarity += 16;
  if (desc.length >= 20 || (input.productName || "").length >= 2) {
    productClarity += 10;
  }
  if (beats >= 3) productClarity += 12;
  if (ideaProblem) productClarity += 8;
  productClarity = clamp(productClarity * 0.55 + base * 0.45);

  let trust = 38;
  if (/レビュー|口コミ|実感|使用感|Before|After|検証|証拠/.test(
    `${structure} ${angle} ${ideaSolution}`
  )) {
    trust += 22;
  }
  if (/信頼|レビュー/.test(input.style || "")) trust += 10;
  if (beats >= 4) trust += 10;
  if (desc.length >= 40) trust += 8;
  trust = clamp(trust * 0.55 + base * 0.45);

  let conversion = 35;
  if (cta.length >= 8) conversion += 18;
  if (/リンク|プロフ|チェック|公式|購入|保存/.test(cta)) conversion += 18;
  if (!cta) conversion -= 15;
  if (input.goal === "purchase" || input.goal === "affiliate_click") {
    conversion += 8;
  }
  conversion = clamp(conversion * 0.5 + base * 0.5);

  let tiktokFit = 45;
  if (input.isVertical !== false) tiktokFit += 15;
  if (duration >= 15 && duration <= 40) tiktokFit += 15;
  else if (duration > 50) tiktokFit -= 12;
  else if (duration > 0 && duration < 12) tiktokFit -= 8;
  if (input.captionsEnabled) tiktokFit += 10;
  if (beats >= 3 && beats <= 6) tiktokFit += 8;
  tiktokFit = clamp(tiktokFit * 0.55 + base * 0.45);

  return {
    hook: hookScore,
    productClarity,
    trust,
    conversion,
    tiktokFit,
  };
}

export function toStarRatings(scores: CriterionScores): MarketingStarRating[] {
  return [
    {
      id: "hook",
      label: "フック力",
      stars: starsFromScore(scores.hook),
      description: "最初の3秒で興味を引けるか",
    },
    {
      id: "product_clarity",
      label: "商品理解",
      stars: starsFromScore(scores.productClarity),
      description: "視聴者が商品の価値を理解できるか",
    },
    {
      id: "trust",
      label: "信頼性",
      stars: starsFromScore(scores.trust),
      description: "レビュー・使用感・証拠があるか",
    },
    {
      id: "conversion",
      label: "購入誘導",
      stars: starsFromScore(scores.conversion),
      description: "購入行動につながるCTAになっているか",
    },
    {
      id: "tiktok_fit",
      label: "TikTok適性",
      stars: starsFromScore(scores.tiktokFit),
      description: "縦動画・テンポ・SNS向きか",
    },
  ];
}

export function computeSalesPowerScore(scores: CriterionScores): number {
  return clamp(
    scores.hook * 0.28 +
      scores.productClarity * 0.2 +
      scores.trust * 0.15 +
      scores.conversion * 0.22 +
      scores.tiktokFit * 0.15
  );
}
