/**
 * OpenAI 接続用スタブ（未実装）
 * AI_PROVIDER=openai 時にここへ実装を追加する。
 */

import type { AnalyzeSalesProductInput } from "../analysis";
import type { GenerateSalesIdeasInput } from "../ideas";
import type { OptimizeVideoInput } from "../optimization";
import type { SalesBrief, SalesVideoIdea, VideoOptimizationResult } from "../types";

export async function analyzeSalesProductOpenAI(
  _input: AnalyzeSalesProductInput
): Promise<SalesBrief> {
  throw new Error(
    "OpenAI 分析は未接続です。AI_PROVIDER=mock を使用するか、openai/analysis を実装してください。"
  );
}

export async function generateSalesVideoIdeasOpenAI(
  _input: GenerateSalesIdeasInput
): Promise<SalesVideoIdea[]> {
  throw new Error(
    "OpenAI 企画生成は未接続です。AI_PROVIDER=mock を使用するか実装してください。"
  );
}

export async function optimizeSalesVideoOpenAI(
  _input: OptimizeVideoInput
): Promise<VideoOptimizationResult> {
  throw new Error(
    "OpenAI 改善は未接続です。AI_PROVIDER=mock を使用するか実装してください。"
  );
}
