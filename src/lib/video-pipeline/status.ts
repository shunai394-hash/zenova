import type { GenerationStatus } from "./types";
import {
  generationStatusToLegacyDb,
  legacyDbToGenerationStatus,
} from "./job-record";

/**
 * 生成ステータス → UI ラベル
 */
export const GENERATION_STATUS_LABELS: Record<GenerationStatus, string> = {
  idle: "待機中",
  analyzing: "商品分析中",
  planning: "動画構成作成中",
  generating: "AI動画生成中",
  completed: "完成",
  failed: "生成失敗",
};

/** プログレス表示用の順序列（failed は除外） */
export const GENERATION_STATUS_FLOW: GenerationStatus[] = [
  "analyzing",
  "planning",
  "generating",
  "completed",
];

export function getGenerationStatusLabel(status: GenerationStatus): string {
  return GENERATION_STATUS_LABELS[status] ?? status;
}

export function generationStatusIndex(status: GenerationStatus): number {
  if (status === "idle") return -1;
  if (status === "failed") return -1;
  return GENERATION_STATUS_FLOW.indexOf(status);
}

/**
 * 既存 GeneratePhase / loading フラグから GenerationStatus を解決
 */
export function resolveGenerationStatus(input: {
  isAnalyzing?: boolean;
  isPlanning?: boolean;
  isGenerating?: boolean;
  hasVideo?: boolean;
  hasError?: boolean;
}): GenerationStatus {
  if (input.hasError && !input.hasVideo) return "failed";
  if (input.hasVideo) return "completed";
  if (input.isGenerating) return "generating";
  if (input.isPlanning) return "planning";
  if (input.isAnalyzing) return "analyzing";
  return "idle";
}

/** DB 保存用（generated_videos.status） */
export function toPersistedVideoStatus(status: GenerationStatus): string {
  return generationStatusToLegacyDb(status);
}

/** DB / provider 生値 → GenerationStatus */
export function fromPersistedVideoStatus(
  raw: string | null | undefined
): GenerationStatus {
  return legacyDbToGenerationStatus(raw);
}
