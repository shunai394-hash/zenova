export const ANALYZE_WORKSPACE_STEPS = [
  { id: 1, key: "analyze", label: "商品分析" },
  { id: 2, key: "plan", label: "動画企画" },
  { id: 3, key: "generate", label: "AI生成" },
  { id: 4, key: "postprep", label: "投稿準備" },
] as const;

export type AnalyzeWorkspaceStepKey =
  (typeof ANALYZE_WORKSPACE_STEPS)[number]["key"];

export type GeneratePhase = "ready" | "generating" | "complete";

export function resolveAnalyzeStep(input: {
  hasAnalysis: boolean;
  isGenerating: boolean;
  hasVideo: boolean;
}): AnalyzeWorkspaceStepKey {
  if (input.hasVideo) return "postprep";
  if (input.isGenerating) return "generate";
  if (input.hasAnalysis) return "plan";
  return "analyze";
}

export function resolveGeneratePhase(input: {
  isGenerating: boolean;
  hasVideo: boolean;
}): GeneratePhase {
  if (input.isGenerating) return "generating";
  if (input.hasVideo) return "complete";
  return "ready";
}

/** 生成中の段階表示（UI用）— GenerationStatus に対応 */
export const GENERATE_PROGRESS_STAGES = [
  { id: "analyzing", label: "商品分析中", status: "analyzing" as const },
  { id: "planning", label: "動画構成作成中", status: "planning" as const },
  { id: "generating", label: "AI動画生成中", status: "generating" as const },
  { id: "completed", label: "完成", status: "completed" as const },
] as const;
