/**
 * generateVideoIdeas — ai-sales-engine への薄いラッパー
 */

import type { ProductAnalysis } from "@/lib/product-analysis";
import {
  generateSalesVideoIdeas,
  type SalesVideoIdea,
} from "@/lib/ai-sales-engine";
import type { AnalysisResult, VideoIdea, VideoPlanGoal } from "./types";

export type VideoIdeaInput = {
  productName: string;
  category?: string | null;
  price?: number | null;
  sellingPoints?: string[];
  targetAudience?: string;
  description?: string;
  analysis?: ProductAnalysis | null;
  analysisResult?: AnalysisResult | null;
};

function toVideoIdea(idea: SalesVideoIdea): VideoIdea {
  return {
    id: idea.id,
    title: idea.title,
    concept: idea.concept,
    targetAudience: idea.targetAudience,
    hook: idea.hook,
    videoStyle: idea.videoStyle,
    timeline: idea.timeline,
    cta: idea.cta,
    reason: idea.reason,
    icon: idea.icon,
    feature: idea.feature,
    suitableProducts: idea.suitableProducts,
    whoFor: idea.whoFor,
    goal: idea.goal as VideoPlanGoal,
    target: idea.target,
    problem: idea.problem,
    solution: idea.solution,
  };
}

export function generateVideoIdeas(
  input: VideoIdeaInput,
  options?: { duration?: number; count?: number }
): VideoIdea[] {
  const ideas = generateSalesVideoIdeas({
    productName: input.productName,
    description: input.description,
    category: input.category,
    target: input.targetAudience,
    sellingPoints: input.sellingPoints,
    analysis: input.analysis,
    duration: options?.duration,
  }).map(toVideoIdea);

  const count = Math.min(3, Math.max(1, options?.count ?? 3));
  return ideas.slice(0, count);
}

export function createDummyVideoIdeas(): VideoIdea[] {
  return generateVideoIdeas({
    productName: "サンプル美容液",
    category: "美容",
    price: 3980,
    sellingPoints: ["使用前後比較ができる", "肌なじみが良い"],
    targetAudience: "20〜40代女性",
  });
}
