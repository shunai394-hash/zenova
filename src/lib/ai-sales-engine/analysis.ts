/**
 * 商品分析（販売企画書）— ProductAnalysis を正本として一貫生成
 */

import type { ProductAnalysis } from "@/lib/product-analysis";
import { normalizeProductAnalysis } from "@/lib/product-analysis/engine";
import type {
  BuyerPersonaProfile,
  ProductUnderstanding,
  SalesBrief,
  SalesVideoScore,
  TikTokSalesAnalysis,
} from "./types";
import { resolveAiSalesProviderId } from "./provider";

export type AnalyzeSalesProductInput = {
  productName: string;
  description?: string;
  category?: string | null;
  target?: string;
  analysis?: ProductAnalysis | null;
  recommendedFormat?: string | null;
  recommendedFormatLabel?: string | null;
};

function preferTarget(
  analysis: ProductAnalysis | null | undefined,
  formTarget?: string
): string {
  return (
    formTarget?.trim() ||
    analysis?.target?.trim() ||
    analysis?.targetInsight?.trim() ||
    analysis?.buyerPersonaDetail?.occupation ||
    "購入検討者"
  );
}

function buildPersonaFromAnalysis(
  analysis: ProductAnalysis,
  formTarget?: string
): BuyerPersonaProfile {
  const detail = analysis.buyerPersonaDetail;
  const target = preferTarget(analysis, formTarget);
  if (detail) {
    return {
      name: detail.name,
      age: detail.age,
      lifestyle: `${detail.occupation} / ${detail.lifestyle}（入力: ${target}）`,
      pain: detail.pain,
    };
  }
  const ageMatch = target.match(/(\d{2})/);
  return {
    name: /会社員|通勤/.test(target) ? "あかり" : "ゆい",
    age: ageMatch ? `${ageMatch[1]}歳前後` : "入力ターゲットに準拠",
    lifestyle: target,
    pain: analysis.painPoints?.[0] || "購買前の不安",
  };
}

function buildProductUnderstanding(
  analysis: ProductAnalysis,
  formTarget?: string
): ProductUnderstanding {
  const target = preferTarget(analysis, formTarget);
  const persona = buildPersonaFromAnalysis(analysis, formTarget);
  const buyers = unique([
    target,
    `${persona.name}（${persona.age}）`,
    persona.lifestyle.split("（")[0]?.trim() || persona.lifestyle,
  ]).slice(0, 3);

  return {
    category: analysis.category || "日用品",
    buyers,
    purchaseReasons: (analysis.purchaseReasons || []).slice(0, 3),
    painPoints: (analysis.painPoints || []).slice(0, 3),
    differentiators: (analysis.productFeatures || analysis.differentiation || [])
      .slice(0, 4)
      .map((d) => (d.length > 24 ? d.slice(0, 24) : d)),
    salesAngles: (
      analysis.recommendedAngles || [analysis.salesAngle].filter(Boolean)
    ).slice(0, 3),
    persona,
  };
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = item.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function buildTikTokAnalysis(analysis: ProductAnalysis): TikTokSalesAnalysis {
  const score = analysis.salesScore?.total ?? 70;
  const stars = Math.max(1, Math.min(5, Math.round(score / 20)));
  const hooks = (
    analysis.recommendedHooks ||
    analysis.recommendedVideoStructure ||
    []
  )
    .map((h) => h.replace(/^\d+[\.．\s:\-–—]*/, "").slice(0, 40))
    .filter((h) => h && !/損して|絶対|必ず/.test(h))
    .slice(0, 3);

  const triggers: string[] = [];
  const blob = [
    ...(analysis.painPoints || []),
    ...(analysis.productFeatures || []),
  ].join(" ");
  if (/日差し|UV|日焼け/.test(blob)) triggers.push("対策意識");
  if (/涼|暑|夏|薄手/.test(blob)) triggers.push("季節性");
  if (/通勤|忙しい|時短/.test(blob)) triggers.push("日常の不便");
  if (triggers.length === 0) triggers.push("共感", "具体性", "比較検討");

  return {
    hookPowerStars: stars,
    emotionTriggers: unique(triggers).slice(0, 4),
    openingHooks:
      hooks.length > 0
        ? hooks
        : [`${preferTarget(analysis)}向けに、特徴を最初の3秒で見せる`],
  };
}

function buildVideoScore(analysis: ProductAnalysis): SalesVideoScore {
  const score = analysis.salesScore?.total ?? 70;
  let videoReady = score;
  const reasons: string[] = [];

  if ((analysis.painPoints || []).length > 0) {
    videoReady += 3;
    reasons.push("悩みが具体的");
  }
  if ((analysis.productFeatures || []).length >= 3) {
    videoReady += 4;
    reasons.push("特徴が分解できている");
  }
  if (analysis.hasImage) {
    videoReady += 3;
    reasons.push("商品画像あり");
  }
  reasons.push(
    analysis.salesScore?.scoreKind === "measured"
      ? "外部データを一部反映"
      : "商品情報ベースのAI推定"
  );

  videoReady = Math.max(0, Math.min(100, Math.round(videoReady)));
  return {
    suitabilityStars: Math.max(1, Math.min(5, Math.round(videoReady / 20))),
    videoReadyScore: videoReady,
    reasons: unique(reasons).slice(0, 4),
  };
}

/** mock 本体 — ProductAnalysis 正本 */
export function analyzeSalesProductMock(
  input: AnalyzeSalesProductInput
): SalesBrief {
  const analysis = input.analysis
    ? normalizeProductAnalysis(input.analysis)
    : null;
  const productName =
    input.productName.trim() || analysis?.productName || "この商品";
  const target = preferTarget(analysis, input.target);

  if (!analysis) {
    return {
      score: 60,
      scoreLabel: "情報不足（AI推定）",
      targetAudience: target,
      sellPoints: ["商品情報を追加すると精度が上がります"],
      recommendedFormat: input.recommendedFormat || "ugc",
      recommendedFormatLabel:
        input.recommendedFormatLabel || input.recommendedFormat || "UGC",
      reason: "分析結果が無いため、入力ターゲットのみ反映しています",
      productUnderstanding: {
        category: input.category || "日用品",
        buyers: [target],
        purchaseReasons: ["特徴が自分向きそう"],
        painPoints: [`${target}の不便を具体化できていない`],
        differentiators: [],
        salesAngles: [`${target}向けの紹介`],
        persona: {
          name: "ゆい",
          age: "入力準拠",
          lifestyle: target,
          pain: "情報が少ない",
        },
      },
      tiktok: {
        hookPowerStars: 3,
        emotionTriggers: ["共感"],
        openingHooks: [`${target}向けに特徴を見せる`],
      },
      videoScore: {
        suitabilityStars: 3,
        videoReadyScore: 60,
        reasons: ["分析不足", "AI推定"],
      },
    };
  }

  const understanding = buildProductUnderstanding(analysis, input.target);
  const sellPoints = unique([
    ...(analysis.productFeatures || []).slice(0, 3),
    ...(analysis.sellingPoints || []).slice(0, 2),
  ]).slice(0, 4);

  const recommendedFormat = input.recommendedFormat || "ugc";
  const score = analysis.salesScore?.total ?? 70;

  return {
    score,
    scoreLabel:
      analysis.salesScore?.scoreNote ||
      analysis.salesScore?.label ||
      "AI推定・参考スコア",
    targetAudience: target,
    sellPoints:
      sellPoints.length > 0 ? sellPoints : ["商品特徴の提示", "場面の具体化"],
    recommendedFormat,
    recommendedFormatLabel:
      input.recommendedFormatLabel || recommendedFormat,
    reason:
      analysis.salesAngle ||
      analysis.salesScore?.tips?.[0] ||
      `${productName}の特徴を${target}の場面に合わせて見せる`,
    productUnderstanding: understanding,
    tiktok: buildTikTokAnalysis(analysis),
    videoScore: buildVideoScore(analysis),
  };
}

export function analyzeSalesProduct(
  input: AnalyzeSalesProductInput
): SalesBrief {
  const provider = resolveAiSalesProviderId();
  if (provider === "openai") {
    console.info(
      "[ai-sales-engine] AI_PROVIDER=openai だが未接続のため mock を使用"
    );
  }
  return analyzeSalesProductMock(input);
}
