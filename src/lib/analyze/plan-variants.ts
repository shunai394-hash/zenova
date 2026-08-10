import type { AiPlanBrief } from "@/lib/analyze/plan-brief";
import type { VideoStyleId } from "@/lib/analyze/video-settings";
import type { ProductAnalysis } from "@/lib/product-analysis";

/** AI別案タブ */
export const PLAN_VARIANT_TABS = [
  { id: "compare", label: "比較", style: "compare" as VideoStyleId },
  { id: "ugc", label: "UGC", style: "ugc" as VideoStyleId },
  { id: "ranking", label: "ランキング", style: "ranking" as VideoStyleId },
] as const;

export type PlanVariantId = (typeof PLAN_VARIANT_TABS)[number]["id"];

export type PlanVariantBundle = {
  id: PlanVariantId;
  label: string;
  style: VideoStyleId;
  brief: AiPlanBrief;
};

function baseProduct(analysis?: ProductAnalysis | null, brief?: AiPlanBrief) {
  return analysis?.productName?.trim() || "この商品";
}

/**
 * 同じ分析から比較 / UGC / ランキングの別案企画書を生成。
 */
export function buildPlanVariants(input: {
  base: AiPlanBrief;
  analysis?: ProductAnalysis | null;
}): PlanVariantBundle[] {
  const { base, analysis } = input;
  const product = baseProduct(analysis, base);
  const pain =
    base.painPoints.split("\n").map((l) => l.trim()).filter(Boolean)[0] ||
    analysis?.painPoints?.[0] ||
    "失敗したくない";

  const compare: AiPlanBrief = {
    ...base,
    firstThreeSeconds: `同じ予算ならどっち？ ${product}を正直比較`,
    structure: [
      "1. 結論先出し（勝ち筋を一言）",
      "2. 比較軸A（価格・使いやすさ）",
      "3. 比較軸B（耐久・サポート）",
      "4. おすすめの人を明示",
      "5. CTA",
    ].join("\n"),
    cta: base.cta.trim() || "詳細比較はプロフのリンクから",
    reason: `比較形式は「選びたい層」の保存率が高く、${product}の差別化を短尺で伝えやすいです。`,
    recommendationScore: base.recommendationScore,
  };

  const ugc: AiPlanBrief = {
    ...base,
    firstThreeSeconds: pain
      ? `正直レビュー。${pain}だった私が使った結果…`
      : `正直レビュー。${product}、期待以上でした`,
    structure: [
      "1. 本音フック（失敗談・驚き）",
      "2. 開封〜使用のリアルシーン",
      "3. ビフォー感 → ベネフィット",
      "4. 向いている人 / 向かない人",
      "5. プロフ誘導CTA",
    ].join("\n"),
    cta: base.cta.trim() || "気になる人はプロフのリンク見てね",
    reason:
      "UGCは信頼性が高く、美容・日用品・ガジェットの初速に強いフォーマットです。",
    recommendationScore: base.recommendationScore,
  };

  const ranking: AiPlanBrief = {
    ...base,
    firstThreeSeconds: `2026年版・これ買わないと損する ${product} 系TOP3`,
    structure: [
      "1. ランキング発表予告",
      "2. 第3位（意外性）",
      "3. 第2位（王道）",
      `4. 第1位（${product}を推す理由）`,
      "5. まとめCTA",
    ].join("\n"),
    cta: base.cta.trim() || "全リンクはプロフィールにまとめてます",
    reason:
      "ランキングは視聴維持と保存が伸びやすく、シリーズ化・量産にも向いています。",
    recommendationScore: base.recommendationScore,
  };

  return PLAN_VARIANT_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    style: tab.style,
    brief: tab.id === "compare" ? compare : tab.id === "ugc" ? ugc : ranking,
  }));
}
