import type { AiPlanBrief } from "@/lib/analyze/plan-brief";
import type { VideoStyleId } from "@/lib/analyze/video-settings";
import type { ProductAnalysis } from "@/lib/product-analysis";
import { normalizeProductAnalysis } from "@/lib/product-analysis/engine";
import { formatTimelineLines } from "@/lib/analyze/scene-timing";

/** AI別案タブ（形式ごとにシーン構造が異なる） */
export const PLAN_VARIANT_TABS = [
  { id: "ugc", label: "UGC", style: "ugc" as VideoStyleId },
  { id: "product_review", label: "商品レビュー", style: "product_review" as VideoStyleId },
  { id: "before_after", label: "Before After", style: "before_after" as VideoStyleId },
  { id: "ad", label: "広告風", style: "ad" as VideoStyleId },
  { id: "compare", label: "比較", style: "compare" as VideoStyleId },
  { id: "ranking", label: "ランキング", style: "ranking" as VideoStyleId },
] as const;

export type PlanVariantId = (typeof PLAN_VARIANT_TABS)[number]["id"];

export type PlanVariantBundle = {
  id: PlanVariantId;
  label: string;
  style: VideoStyleId;
  brief: AiPlanBrief;
};

function productOf(analysis?: ProductAnalysis | null) {
  return analysis?.productName?.trim() || "この商品";
}

function featuresOf(analysis?: ProductAnalysis | null): string[] {
  if (!analysis) return [];
  const n = normalizeProductAnalysis(analysis);
  return (n.productFeatures || n.sellingPoints || []).slice(0, 3);
}

function structureFromScenes(
  scenes: { scene: string; text: string }[],
  duration: number
): string {
  return formatTimelineLines(scenes, duration)
    .map((t) => `${t.second}秒: ${t.scene} — ${t.text}`)
    .join("\n");
}

/**
 * 同じ分析から形式別企画を生成。
 * タイトルだけでなくシーン構造を変える。
 */
export function buildPlanVariants(input: {
  base: AiPlanBrief;
  analysis?: ProductAnalysis | null;
  durationSec?: number;
}): PlanVariantBundle[] {
  const { base, analysis } = input;
  const duration = input.durationSec ?? 30;
  const product = productOf(analysis);
  const features = featuresOf(analysis);
  const f0 = features[0] || "主な特徴";
  const f1 = features[1] || f0;
  const pain =
    base.painPoints.split("\n").map((l) => l.trim()).filter(Boolean)[0] ||
    analysis?.painPoints?.[0] ||
    "選び方に迷う";
  const target = base.target.trim() || analysis?.target || "購入検討者";
  const cta = base.cta.trim() || analysis?.cta || "プロフィールのリンクから詳細へ";
  const hook =
    analysis?.recommendedHooks?.[0] ||
    base.firstThreeSeconds ||
    `${pain.replace(/。$/, "")}？`;
  const hasReview = Boolean(analysis?.hasUserReview);

  const ugc: AiPlanBrief = {
    ...base,
    firstThreeSeconds: hook,
    structure: structureFromScenes(
      [
        { scene: "フック", text: hook },
        { scene: "悩み", text: pain },
        { scene: "商品紹介", text: `${product}を画面に出す` },
        { scene: "特徴", text: [f0, f1].filter(Boolean).join(" / ") },
        {
          scene: "使用イメージ",
          text: `${target}の場面での取り入れ方（紹介・イメージ。実体験断定なし）`,
        },
        { scene: "CTA", text: cta },
      ],
      duration
    ),
    cta,
    reason:
      "UGCは友達に勧めるトーンの紹介向け。実使用レビューがない場合は体験談を装いません。",
  };

  const productReview: AiPlanBrief = {
    ...base,
    firstThreeSeconds: hasReview
      ? `${product}、チェックしたいポイント`
      : `${product}の特徴を整理すると`,
    structure: structureFromScenes(
      [
        {
          scene: "フック",
          text: hasReview
            ? `${product}、レビューでよく見られるポイント`
            : `${product}の注目ポイント`,
        },
        { scene: "商品紹介", text: `${product}の概要` },
        { scene: "特徴1", text: f0 },
        { scene: "特徴2", text: f1 },
        {
          scene: "向いている人",
          text: `${target}で、${pain.replace(/。$/, "")}人`,
        },
        { scene: "CTA", text: cta },
      ],
      duration
    ),
    cta,
    reason: hasReview
      ? "入力レビューを補助情報として使う商品レビュー構成です。"
      : "実体験未入力のため、特徴紹介型のレビュー構成にします（体験談は書きません）。",
  };

  const beforeAfter: AiPlanBrief = {
    ...base,
    firstThreeSeconds: `Before: ${pain.replace(/。$/, "")}`,
    structure: structureFromScenes(
      [
        { scene: "Before", text: pain },
        { scene: "問題", text: `${target}の場面で起きやすい不便` },
        { scene: "商品登場", text: `${product}を画面に出す` },
        {
          scene: "After",
          text: `特徴（${f0}）を取り入れた後のイメージ（断定しない）`,
        },
        { scene: "メリット", text: [f0, f1].filter(Boolean).join(" / ") },
        { scene: "CTA", text: cta },
      ],
      duration
    ),
    cta,
    reason:
      "Before→Afterは変化イメージを見せる構成。効果の断定はせず、特徴ベースで示します。",
  };

  const ad: AiPlanBrief = {
    ...base,
    firstThreeSeconds: hook,
    structure: structureFromScenes(
      [
        { scene: "フック", text: hook },
        { scene: "ベネフィット", text: f0 },
        { scene: "商品ヒーロー", text: `${product}を大きく見せる` },
        { scene: "証拠・特徴", text: [f0, f1].filter(Boolean).join(" / ") },
        { scene: "オファー", text: `${target}向けの次の一歩` },
        { scene: "CTA", text: cta },
      ],
      duration
    ),
    cta,
    reason: "広告風は結論とビジュアル優先。煽り過ぎず、商品特徴で説得します。",
  };

  const compare: AiPlanBrief = {
    ...base,
    firstThreeSeconds: `選ぶとき迷うポイント、整理するとこうなります`,
    structure: structureFromScenes(
      [
        { scene: "選択の悩み", text: "判断軸が分からず比較しづらい" },
        { scene: "比較軸", text: f0 },
        { scene: "商品の特徴", text: [f0, f1].join(" / ") },
        { scene: "向いている人", text: `${target}で、${pain.replace(/。$/, "")}人` },
        { scene: "向かない人", text: "別の対策で十分な人（無理に勧めない）" },
        { scene: "CTA", text: cta },
      ],
      duration
    ),
    cta,
    reason: `比較形式は「選びたい層」に向きます。競合は捏造せず、適合条件で整理します。`,
  };

  const ranking: AiPlanBrief = {
    ...base,
    firstThreeSeconds: `チェックしたいポイント、この順番で整理`,
    structure: structureFromScenes(
      [
        { scene: "予告", text: `${product}を選ぶときの注目点` },
        { scene: "ポイント3", text: f1 },
        { scene: "ポイント2", text: f0 },
        { scene: "ポイント1", text: pain.replace(/。$/, "") + "への向きやすさ" },
        { scene: "まとめ", text: `${target}に向く理由を一言` },
        { scene: "CTA", text: cta },
      ],
      duration
    ),
    cta,
    reason:
      "ランキング風は視聴維持向き。架空の競合TOPは作らず、商品内の注目点ランキングにします。",
  };

  return [
    { id: "ugc", label: "UGC", style: "ugc", brief: ugc },
    {
      id: "product_review",
      label: "商品レビュー",
      style: "product_review",
      brief: productReview,
    },
    {
      id: "before_after",
      label: "Before After",
      style: "before_after",
      brief: beforeAfter,
    },
    { id: "ad", label: "広告風", style: "ad", brief: ad },
    { id: "compare", label: "比較", style: "compare", brief: compare },
    { id: "ranking", label: "ランキング", style: "ranking", brief: ranking },
  ];
}
