export type VideoTemplateId =
  | "problem_solution"
  | "before_after"
  | "unboxing"
  | "comparison"
  | "lifestyle";

export type VideoTemplateBeat = {
  /** 秒数レンジ例: "0-3" */
  timing: string;
  title: string;
  direction: string;
};

export type VideoTemplate = {
  id: VideoTemplateId;
  name: string;
  nameJa: string;
  description: string;
  bestFor: string[];
  beats: VideoTemplateBeat[];
  hookStyle: string;
  ctaStyle: string;
  durationSec: number;
};

export type TemplateSelectionInput = {
  salesAngle?: string | null;
  category?: string | null;
  target?: string | null;
  productName?: string | null;
  description?: string | null;
  offerStyle?: string | null;
};

export type TemplateSelectionResult = {
  template: VideoTemplate;
  score: number;
  reasons: string[];
  alternatives: Array<{
    id: VideoTemplateId;
    score: number;
  }>;
};
