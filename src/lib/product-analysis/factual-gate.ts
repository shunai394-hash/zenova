/**
 * ProductAnalysis 最終出力ゲート
 * Groq/heuristic いずれの結果もここを通して事実ドリフトを防ぐ。
 */

import type { ProductAnalysis } from "./types";
import {
  buildClaimBuckets,
  buildSafeSellingPoints,
  buildSourceBlob,
  containsExperienceClaim,
  expandExcludedClaims,
  filterClaimAgainstSource,
  sanitizeStringList,
  stripUnsupportedProductClaims,
  type ClaimBuckets,
} from "./claim-guard";

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = item.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out;
}

export function applyFactualGate(
  analysis: ProductAnalysis,
  input: {
    productName: string;
    description?: string;
    reviewText?: string;
    target?: string;
    platform?: string;
  }
): ProductAnalysis {
  const sourceBlob = buildSourceBlob({
    productName: input.productName,
    description: input.description,
    reviewText: input.reviewText,
  });
  const hasUserReview = Boolean(
    analysis.hasUserReview ||
      (input.reviewText && input.reviewText.trim().length >= 20)
  );

  const buckets = buildClaimBuckets({
    productName: input.productName,
    description: input.description,
    reviewText: input.reviewText,
    target: input.target || analysis.target,
    platform: input.platform || analysis.platform,
    candidateInferred: [
      ...(analysis.inferred || []),
      ...(analysis.inferredClaims || []),
    ],
  });

  // LLM/heuristic の候補特徴も confirmed に寄せて再検証
  const candidateFeatures = [
    ...(analysis.productFeatures || []),
    ...(analysis.confirmed || []),
    ...(analysis.factualClaims || []),
  ];
  const confirmed = unique([
    ...buckets.confirmed,
    ...sanitizeStringList(candidateFeatures, {
      sourceBlob,
      excluded: buckets.excluded,
      hasUserReview,
      allowInferredWording: false,
      limit: 12,
    }),
  ]).filter((c) => c !== input.productName);

  const inferred = buckets.inferred;
  const unknown = buckets.unknown;
  const excluded = buckets.excluded;

  const sellingPoints = buildSafeSellingPoints(
    { ...buckets, confirmed },
    analysis.sellingPoints || [],
    sourceBlob
  );

  const painPoints = sanitizeStringList(analysis.painPoints, {
    sourceBlob: `${sourceBlob}\n${input.target || analysis.target || ""}`,
    excluded,
    hasUserReview,
    allowInferredWording: true,
    limit: 4,
  }).map((p) =>
    // 効果断定を弱める
    p.replace(/改善する|効果的|治す/g, "気になる")
  );

  const hooks = sanitizeStringList(analysis.recommendedHooks, {
    sourceBlob: `${sourceBlob}\n${input.target || ""}`,
    excluded,
    hasUserReview,
    allowInferredWording: false,
    limit: 3,
  })
    .map((h) => stripUnsupportedProductClaims(h, { ...buckets, confirmed }, sourceBlob))
    .filter(Boolean);

  const safeHooks =
    hooks.length > 0
      ? hooks
      : confirmed[0]
        ? [`${input.target || "検討中の人"}向けに、${confirmed[0]}を最初に見せる`]
        : [`${input.target || "検討中の人"}向けに、入力された商品情報だけを伝える`];

  const differentiation = sanitizeStringList(analysis.differentiation, {
    sourceBlob,
    excluded,
    hasUserReview,
    allowInferredWording: false,
    limit: 4,
  });

  const purchaseReasons = sanitizeStringList(analysis.purchaseReasons, {
    sourceBlob: `${sourceBlob}\n${(input.target || "").toString()}`,
    excluded,
    hasUserReview,
    allowInferredWording: true,
    limit: 4,
  });

  const customerBenefits = sanitizeStringList(analysis.customerBenefits, {
    sourceBlob,
    excluded,
    hasUserReview,
    allowInferredWording: true,
    limit: 4,
  }).filter((b) => !/改善|治療|予防|効果的/.test(b));

  const summary = stripUnsupportedProductClaims(
    analysis.summary || "",
    { ...buckets, confirmed },
    sourceBlob
  ) || `${input.productName}について、入力情報の範囲で整理した分析です。`;

  return {
    ...analysis,
    productName: input.productName,
    target: input.target || analysis.target,
    platform: input.platform || analysis.platform,
    productFeatures: confirmed,
    confirmed,
    inferred,
    unknown,
    excluded,
    notSupported: excluded,
    factualClaims: confirmed,
    inferredClaims: inferred,
    uncertainty: unique([
      ...(analysis.uncertainty || []).filter(
        (u) => !containsExperienceClaim(u) || hasUserReview
      ),
      ...unknown.slice(0, 4),
      hasUserReview ? "" : "実使用レビュー未入力のため、体験談表現は使わない",
    ]).filter(Boolean),
    sellingPoints,
    painPoints:
      painPoints.length > 0
        ? painPoints
        : input.target
          ? [`${input.target}の場面での不便を、入力情報の範囲で言語化する`]
          : [],
    recommendedHooks: safeHooks,
    differentiation:
      differentiation.length > 0
        ? differentiation
        : confirmed.slice(0, 2).map((c) => `明示特徴: ${c}`),
    purchaseReasons:
      purchaseReasons.length > 0
        ? purchaseReasons
        : confirmed.slice(0, 2).map((c) => `${c}が自分の用途に合いそうだから`),
    customerBenefits,
    summary,
    salesAngle: stripUnsupportedProductClaims(
      analysis.salesAngle || "",
      { ...buckets, confirmed },
      sourceBlob
    ) ||
      (confirmed[0]
        ? `${input.target || "ターゲット"}向けに、${confirmed[0]}など入力にある特徴を見せる`
        : `${input.target || "ターゲット"}向けに、入力情報の範囲で紹介する`),
    offerStyle: hasUserReview
      ? "入力レビューを補助情報とした紹介"
      : "商品情報ベースの紹介（実体験レビューなし）",
  };
}

export function getClaimBucketsFromAnalysis(
  analysis: ProductAnalysis
): ClaimBuckets {
  const confirmed =
    analysis.confirmed ||
    analysis.productFeatures ||
    analysis.factualClaims ||
    [];
  const excludedRaw = analysis.excluded || analysis.notSupported || [];
  const excluded = expandExcludedClaims(excludedRaw, confirmed);
  return {
    confirmed,
    inferred: analysis.inferred || analysis.inferredClaims || [],
    unknown: analysis.unknown || analysis.uncertainty || [],
    excluded,
    notSupported: analysis.notSupported || excluded,
  };
}

export function sanitizeIdeaText(
  text: string,
  analysis: ProductAnalysis,
  sourceBlob: string
): string {
  const buckets = getClaimBucketsFromAnalysis(analysis);
  return stripUnsupportedProductClaims(text, buckets, sourceBlob);
}

export { filterClaimAgainstSource };
