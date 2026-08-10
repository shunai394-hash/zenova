/**
 * AI_PROVIDER 解決
 * AI_PROVIDER=mock|openai
 */

import type { AiSalesProviderId } from "./types";

export function resolveAiSalesProviderId(
  explicit?: string | null
): AiSalesProviderId {
  const raw = (
    explicit ||
    process.env.AI_PROVIDER ||
    "mock"
  )
    .trim()
    .toLowerCase();
  if (raw === "openai") return "openai";
  return "mock";
}

export function getAiSalesProviderLabel(
  id?: AiSalesProviderId | null
): string {
  const resolved = id || resolveAiSalesProviderId();
  return resolved === "openai" ? "OpenAI" : "Mock（ルールベース）";
}
