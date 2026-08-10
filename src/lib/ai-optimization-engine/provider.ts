/**
 * AI_OPTIMIZATION_PROVIDER 解決
 * AI_OPTIMIZATION_PROVIDER=mock|openai
 */

import type { AiOptimizationProviderId } from "./types";

export function resolveAiOptimizationProviderId(
  explicit?: string | null
): AiOptimizationProviderId {
  const raw = (
    explicit ||
    process.env.AI_OPTIMIZATION_PROVIDER ||
    "mock"
  )
    .trim()
    .toLowerCase();
  if (raw === "openai") return "openai";
  return "mock";
}

export function getAiOptimizationProviderLabel(
  id?: AiOptimizationProviderId | null
): string {
  const resolved = id || resolveAiOptimizationProviderId();
  return resolved === "openai" ? "OpenAI" : "Mock（ルールベース）";
}
