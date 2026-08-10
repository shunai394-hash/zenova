/**
 * 改善優先順位・投稿シミュレーション
 */

import type {
  MarketingCheckInput,
  MarketingPriorityItem,
  PostSimulationForecast,
} from "./types";
import type { CriterionScores } from "./score";

const CRITERION_META: {
  key: keyof CriterionScores;
  title: string;
  reason: string;
}[] = [
  {
    key: "hook",
    title: "冒頭3秒",
    reason: "離脱率低下のため",
  },
  {
    key: "conversion",
    title: "CTA",
    reason: "購入につながる導線強化",
  },
  {
    key: "productClarity",
    title: "商品説明",
    reason: "価値理解を深めて欲求を高めるため",
  },
  {
    key: "trust",
    title: "信頼性",
    reason: "証拠・使用感で納得感を上げるため",
  },
  {
    key: "tiktokFit",
    title: "TikTok適性",
    reason: "保存・拡散されやすい尺とテンポに合わせるため",
  },
];

/**
 * スコアが低い順に改善優先度を返す（上位3件）
 */
export function buildImprovementPriorities(
  scores: CriterionScores
): MarketingPriorityItem[] {
  return [...CRITERION_META]
    .sort((a, b) => scores[a.key] - scores[b.key])
    .slice(0, 3)
    .map((item, index) => ({
      rank: index + 1,
      title: item.title,
      reason: item.reason,
    }));
}

export function buildScoreReasons(
  scores: CriterionScores,
  input: MarketingCheckInput
): string[] {
  const reasons: string[] = [];
  const hook = (input.hook || "").trim();
  const cta = (input.cta || "").trim();

  if (scores.hook >= 75) {
    reasons.push("冒頭3秒のフックが強い");
  } else if (scores.hook < 60) {
    reasons.push("冒頭3秒の引きが弱い");
  } else {
    reasons.push("冒頭フックはまずまず");
  }

  if (scores.productClarity >= 70) {
    reasons.push("商品メリットが明確");
  } else {
    reasons.push("商品メリットの伝え方が弱い");
  }

  if (!cta || scores.conversion < 65) {
    reasons.push("CTAが弱い");
  } else if (scores.conversion >= 80) {
    reasons.push("購入導線のCTAがはっきりしている");
  } else {
    reasons.push("CTAは改善余地あり");
  }

  if (scores.trust >= 75) {
    reasons.push("使用感・証拠で信頼を得やすい");
  }

  if (scores.tiktokFit >= 75) {
    reasons.push("縦動画・尺がSNS向き");
  }

  return reasons.slice(0, 4);
}

export function buildPostSimulation(
  input: MarketingCheckInput,
  scores: CriterionScores,
  salesPower: number
): PostSimulationForecast {
  const audience =
    input.target?.trim() ||
    input.targetAudience?.trim() ||
    input.whoFor?.trim() ||
    "20代女性 美容関心層";

  const saveLikelihood = Math.max(
    35,
    Math.min(
      95,
      Math.round(scores.hook * 0.35 + scores.tiktokFit * 0.4 + salesPower * 0.25)
    )
  );
  const commentLikelihood = Math.max(
    30,
    Math.min(
      92,
      Math.round(
        scores.hook * 0.3 +
          scores.productClarity * 0.25 +
          scores.trust * 0.25 +
          salesPower * 0.2
      )
    )
  );
  const purchaseLikelihood = Math.max(
    28,
    Math.min(
      95,
      Math.round(
        scores.conversion * 0.45 +
          scores.productClarity * 0.2 +
          scores.trust * 0.15 +
          salesPower * 0.2
      )
    )
  );

  return {
    audience,
    saveLikelihood,
    commentLikelihood,
    purchaseLikelihood,
    disclaimer: "※実測ではなくAI予測です",
  };
}

export function buildAiFeedbackSummary(
  salesPower: number,
  priorities: MarketingPriorityItem[],
  reasons: string[]
): string {
  const top = priorities
    .map((p) => `${p.rank}位 ${p.title}（${p.reason}）`)
    .join(" / ");
  return `動画販売力${salesPower}点。${reasons.join("。")}。改善優先: ${top}`;
}
