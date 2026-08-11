/**
 * 販売目的別の動画企画3案 — ProductAnalysis 正本から差別化生成
 */

import type { ProductAnalysis } from "@/lib/product-analysis";
import { normalizeProductAnalysis } from "@/lib/product-analysis/engine";
import type { SalesBrief, SalesGoal, SalesVideoIdea } from "./types";
import { analyzeSalesProduct } from "./analysis";
import { resolveAiSalesProviderId } from "./provider";
import { formatTimelineLines } from "@/lib/analyze/scene-timing";

export type GenerateSalesIdeasInput = {
  productName: string;
  description?: string;
  category?: string | null;
  target?: string;
  sellingPoints?: string[];
  analysis?: ProductAnalysis | null;
  brief?: SalesBrief | null;
  duration?: number;
};

function featureList(analysis: ProductAnalysis | null): string[] {
  if (!analysis) return [];
  return (
    analysis.productFeatures?.length
      ? analysis.productFeatures
      : analysis.sellingPoints || []
  ).slice(0, 4);
}

function generateSalesVideoIdeasMock(
  input: GenerateSalesIdeasInput
): SalesVideoIdea[] {
  const duration = Math.min(60, Math.max(15, input.duration ?? 30));
  const analysis = input.analysis
    ? normalizeProductAnalysis(input.analysis)
    : null;
  const brief =
    input.brief ||
    analyzeSalesProduct({
      productName: input.productName,
      description: input.description,
      category: input.category,
      target: input.target,
      analysis,
    });

  const productName =
    input.productName.trim() || analysis?.productName || "この商品";
  const targetAudience =
    input.target?.trim() ||
    analysis?.target?.trim() ||
    brief.targetAudience ||
    "購入検討者";
  const shortTarget = targetAudience.slice(0, 16);
  const pain =
    analysis?.painPoints?.[0] ||
    brief.productUnderstanding.painPoints[0] ||
    `${targetAudience}の不便`;
  const features = featureList(analysis);
  const featureA = features[0] || brief.sellPoints[0] || "商品の主な特徴";
  const featureB = features[1] || features[0] || "もう一つの特徴";
  const hookCandidates = analysis?.recommendedHooks || [];
  const hasReview = Boolean(analysis?.hasUserReview);

  const idea1: SalesVideoIdea = {
    id: "sales-pain-solve-1",
    kind: "pain_solve",
    title: "悩み解決型",
    target: shortTarget,
    concept: "悩み解決型",
    targetAudience,
    whoFor: `${pain}で困っている人`,
    hook: hookCandidates[0] || `${pain.replace(/。$/, "")}？`,
    problem: pain,
    solution: `${featureA}など、商品情報にある特徴で解決イメージを示す`,
    videoStyle: "ugc",
    goal: "purchase" as SalesGoal,
    cta: analysis?.cta || "プロフィールのリンクから詳細をチェック",
    reason: `${targetAudience}の悩みを先に出し、${productName}の特徴で解決策を見せます。`,
    icon: "💡",
    feature: "悩み → 商品 → メリット → 使用イメージ → CTA",
    suitableProducts: brief.productUnderstanding.category,
    timeline: formatTimelineLines(
      [
        { scene: "フック", text: hookCandidates[0] || `${pain.replace(/。$/, "")}？` },
        { scene: "悩み", text: pain },
        { scene: "商品紹介", text: `${productName}を画面に出す` },
        { scene: "メリット", text: featureA },
        { scene: "使用イメージ", text: `${targetAudience}の場面での取り入れ方（紹介）` },
        { scene: "CTA", text: analysis?.cta || "プロフィールのリンクへ" },
      ],
      duration
    ),
  };

  const idea2: SalesVideoIdea = {
    id: "sales-viral-intro-2",
    kind: "viral_intro",
    title: "商品発見型",
    target: shortTarget,
    concept: "発見・紹介型",
    targetAudience,
    whoFor: "新しい対策・アイテムを探している人",
    hook:
      hookCandidates[1] ||
      (featureA ? `こんな特徴、知ってた？ ${featureA}` : `${productName}、こういう使い方ができます`),
    problem: "情報が多すぎて、自分向きの商品が分からない",
    solution: `${featureA} / ${featureB} をテンポよく紹介`,
    videoStyle: "ad",
    goal: "affiliate_click" as SalesGoal,
    cta: analysis?.cta || "プロフィールリンクへ",
    reason: "意外な特徴から入り、使い道とメリットで購入検討を後押しします。",
    icon: "🔎",
    feature: "意外な特徴 → 紹介 → 使い道 → メリット → CTA",
    suitableProducts: brief.productUnderstanding.category,
    timeline: formatTimelineLines(
      [
        {
          scene: "フック",
          text:
            hookCandidates[1] ||
            (featureA ? `こんな特徴、知ってた？ ${featureA}` : productName),
        },
        { scene: "商品紹介", text: `${productName}の概要` },
        { scene: "使い道", text: `${targetAudience}の場面での使い方イメージ` },
        { scene: "メリット", text: [featureA, featureB].filter(Boolean).join(" / ") },
        { scene: "整理", text: "向いている人を一言で" },
        { scene: "CTA", text: analysis?.cta || "プロフィールリンクへ" },
      ],
      duration
    ),
  };

  const idea3: SalesVideoIdea = {
    id: "sales-review-trust-3",
    kind: "review_trust",
    title: hasReview ? "レビュー活用型" : "比較・選択支援型",
    target: shortTarget,
    concept: hasReview ? "レビュー補足型" : "比較・選択支援型",
    targetAudience,
    whoFor: "買う前に選び方を整理したい人",
    hook: hasReview
      ? `${productName}、レビューでよく見られるポイント`
      : `選ぶとき迷うポイント、整理するとこうなります`,
    problem: "どれを選べばいいか、判断軸が分からない",
    solution: hasReview
      ? "入力レビューと商品特徴を分けて伝える"
      : "向いている人 / 向いていない人で判断を助ける（競合は捏造しない）",
    videoStyle: hasReview ? "product_review" : "compare",
    goal: "brand_awareness" as SalesGoal,
    cta: analysis?.cta || "詳細を見る",
    reason: hasReview
      ? "実在するレビュー入力を補助情報として使います。"
      : "競合を捏造せず、適合条件で選択を支援します。",
    icon: hasReview ? "⭐" : "⚖️",
    feature: hasReview
      ? "ポイント整理 → 特徴 → 向いている人 → CTA"
      : "選択の悩み → 判断軸 → 特徴 → 向いている人 → CTA",
    suitableProducts: brief.productUnderstanding.category,
    timeline: formatTimelineLines(
      [
        {
          scene: "フック",
          text: hasReview
            ? `${productName}、チェックしたいポイント`
            : "選ぶとき迷うポイント、整理するとこうなります",
        },
        { scene: "選択の悩み", text: "判断軸が分からず比較しづらい" },
        { scene: "判断軸", text: featureA },
        { scene: "商品の特徴", text: [featureA, featureB].filter(Boolean).join(" / ") },
        {
          scene: "向いている人",
          text: `${targetAudience}で、${pain.replace(/。$/, "")}人`,
        },
        { scene: "CTA", text: analysis?.cta || "詳細を見る" },
      ],
      duration
    ),
  };

  return [idea1, idea2, idea3];
}

export function generateSalesVideoIdeas(
  input: GenerateSalesIdeasInput
): SalesVideoIdea[] {
  const provider = resolveAiSalesProviderId();
  if (provider === "openai") {
    console.info(
      "[ai-sales-engine] AI_PROVIDER=openai だが未接続のため mock を使用"
    );
  }
  return generateSalesVideoIdeasMock(input);
}
