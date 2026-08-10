/**
 * 投稿前AIマーケティング診断
 * 現状はルールベース。将来 OpenAI API 等へ差し替え。
 */

import type { MarketingCheckInput, MarketingCheckReport } from "./types";
import { resolveAiMarketingProviderId } from "./provider";
import {
  computeSalesPowerScore,
  scoreMarketingCriteria,
  toStarRatings,
} from "./score";
import {
  buildAiFeedbackSummary,
  buildImprovementPriorities,
  buildPostSimulation,
  buildScoreReasons,
} from "./recommendation";

export type { MarketingCheckInput };

function runMarketingCheckMock(
  input: MarketingCheckInput
): MarketingCheckReport {
  const scores = scoreMarketingCriteria(input);
  const salesPowerScore = computeSalesPowerScore(scores);
  const criteria = toStarRatings(scores);
  const priorities = buildImprovementPriorities(scores);
  const scoreReasons = buildScoreReasons(scores, input);
  const simulation = buildPostSimulation(input, scores, salesPowerScore);
  const aiFeedback = buildAiFeedbackSummary(
    salesPowerScore,
    priorities,
    scoreReasons
  );

  return {
    salesPowerScore,
    scoreReasons,
    criteria,
    priorities,
    simulation,
    aiFeedback,
    hookScore: scores.hook,
    conversionScore: scores.conversion,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * 公開エントリ — AI_MARKETING_PROVIDER に応じて切替
 */
export function runMarketingCheck(
  input: MarketingCheckInput
): MarketingCheckReport {
  const provider = resolveAiMarketingProviderId();
  if (provider === "openai") {
    // 将来: return await runMarketingCheckOpenAI(input)
    console.info(
      "[ai-marketing-engine] AI_MARKETING_PROVIDER=openai だが未接続のため mock を使用"
    );
  }
  return runMarketingCheckMock(input);
}

export { runMarketingCheckMock };
