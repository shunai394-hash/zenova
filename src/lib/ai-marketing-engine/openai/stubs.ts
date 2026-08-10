/**
 * OpenAI 接続用スタブ（未実装）
 * AI_MARKETING_PROVIDER=openai 時にここへ実装を追加する。
 */

import type { MarketingCheckInput, MarketingCheckReport } from "../types";

export async function runMarketingCheckOpenAI(
  _input: MarketingCheckInput
): Promise<MarketingCheckReport> {
  throw new Error(
    "OpenAI マーケティング診断は未接続です。AI_MARKETING_PROVIDER=mock を使用するか実装してください。"
  );
}
