/**
 * TikTok 販売動画シナリオ（Kling 投入前の企画 JSON）
 */

export type SalesVideoScenario = {
  target_customer: string;
  selling_angle: string;
  hook_0_2sec: string;
  scene_1: string;
  scene_2: string;
  scene_3: string;
  cta: string;
  kling_prompt: string;
};

export type GenerateSalesScenarioRequest = {
  product_name: string;
  description: string;
  target: string;
  platform?: string;
  /** 商品画像ファイル名など（任意。映像指示のヒントに使う） */
  image_name?: string | null;
  /** analyze-product の結果を渡すとシナリオ精度が上がる（任意） */
  analysis?: {
    summary?: string;
    salesAngle?: string;
    sellingPoints?: string[];
    painPoints?: string[];
    targetInsight?: string;
    cta?: string;
    recommendedVideoStructure?: string[];
  } | null;
};

export type GenerateSalesScenarioResponse = SalesVideoScenario & {
  product_name: string;
  platform: string;
};

/** Kling 投入前の広告品質チェック入力 */
export type OptimizeSalesScenarioRequest = {
  product_name: string;
  description: string;
  target_customer: string;
  selling_angle: string;
  /** hook_0_2sec 相当 */
  hook: string;
  scene_1: string;
  scene_2: string;
  scene_3: string;
  cta: string;
};

export type OptimizeSalesScenarioResponse = {
  score: number;
  improvements: string[];
  optimized_hook: string;
  optimized_scene_1: string;
  optimized_scene_2: string;
  optimized_scene_3: string;
  optimized_cta: string;
  optimized_kling_prompt: string;
};
