/**
 * AI_MARKETING_PROVIDER 解決
 * AI_MARKETING_PROVIDER=mock|openai
 */

import type { AiMarketingProviderId } from "./types";

export function resolveAiMarketingProviderId(
  explicit?: string | null
): AiMarketingProviderId {
  const raw = (
    explicit ||
    process.env.AI_MARKETING_PROVIDER ||
    "mock"
  )
    .trim()
    .toLowerCase();
  if (raw === "openai") return "openai";
  return "mock";
}

export function getAiMarketingProviderLabel(
  id?: AiMarketingProviderId | null
): string {
  const resolved = id || resolveAiMarketingProviderId();
  return resolved === "openai" ? "OpenAI" : "Mock（ルールベース）";
}
