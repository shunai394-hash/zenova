/**
 * OpenAI 接続用スタブ（未実装）
 */

import type {
  AnalyzePostFeedbackInput,
  GenerateNextVideosInput,
  ImprovementRecord,
  NextVideoIdea,
  OptimizationReflection,
} from "../types";
import type { BuildImprovementInput } from "../learning";

export async function analyzePostFeedbackOpenAI(
  _input: AnalyzePostFeedbackInput
): Promise<OptimizationReflection> {
  throw new Error(
    "OpenAI 振り返りは未接続です。AI_OPTIMIZATION_PROVIDER=mock を使用するか実装してください。"
  );
}

export async function buildImprovementRecordOpenAI(
  _input: BuildImprovementInput
): Promise<ImprovementRecord> {
  throw new Error(
    "OpenAI 改善学習は未接続です。AI_OPTIMIZATION_PROVIDER=mock を使用するか実装してください。"
  );
}

export async function generateNextVideoIdeasOpenAI(
  _input: GenerateNextVideosInput
): Promise<NextVideoIdea[]> {
  throw new Error(
    "OpenAI 次動画生成は未接続です。AI_OPTIMIZATION_PROVIDER=mock を使用するか実装してください。"
  );
}
