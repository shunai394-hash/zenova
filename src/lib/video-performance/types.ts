export type AnalyzeVideoPerformanceRequest = {
  product_name: string;
  selling_angle: string;
  hook: string;
  scenes: string[] | string;
  cta: string;
  video_url?: string | null;
  narration_script?: string | null;
};

export type AnalyzeVideoPerformanceResponse = {
  overall_score: number;
  hook_score: number;
  product_score: number;
  cta_score: number;
  tiktok_score: number;
  strengths: string[];
  improvements: string[];
  next_action_prompt: string;
};
