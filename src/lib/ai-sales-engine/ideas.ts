/**
 * 販売目的別の動画企画3案生成
 * 現状はルールベース。将来 OpenAI API 等へ差し替え。
 */

import type { ProductAnalysis } from "@/lib/product-analysis";
import type { SalesBrief, SalesGoal, SalesVideoIdea } from "./types";
import { analyzeSalesProduct } from "./analysis";
import { resolveAiSalesProviderId } from "./provider";

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

function painWord(input: GenerateSalesIdeasInput, brief: SalesBrief): string {
  return (
    input.analysis?.painPoints?.[0]?.trim() ||
    brief.productUnderstanding.painPoints[0] ||
    brief.productUnderstanding.purchaseReasons[0] ||
    "毎日の手間"
  );
}

function shortTarget(audience: string, personaAge: string): string {
  if (/20/.test(audience) || personaAge.includes("20") || personaAge.includes("28")) {
    return "20代女性";
  }
  if (/30|40/.test(audience)) return "30〜40代女性";
  if (/男性|ガジェット/.test(audience)) return "30代男女";
  return audience.split(/[〜・、]/)[0]?.trim().slice(0, 12) || "20代女性";
}

function scaleTimeline(
  scenes: { scene: string; text: string }[],
  duration: number
): { second: string; scene: string; text: string }[] {
  const n = scenes.length;
  // 例: 0-3 / 3-10 / 10-25 / 25-35 / 35-40
  if (n === 5 && duration >= 35) {
    const marks = [
      0,
      3,
      Math.round(duration * 0.25),
      Math.round(duration * 0.625),
      Math.round(duration * 0.875),
      duration,
    ];
    return scenes.map((s, i) => ({
      ...s,
      second: `${marks[i]}-${marks[i + 1]}`,
      text: s.text.slice(0, 60),
    }));
  }
  if (n === 4 && duration >= 20) {
    const marks = [
      0,
      Math.min(3, Math.round(duration * 0.1)),
      Math.round(duration * 0.33),
      Math.round(duration * 0.67),
      duration,
    ];
    return scenes.map((s, i) => ({
      ...s,
      second: `${marks[i]}-${marks[i + 1]}`,
      text: s.text.slice(0, 60),
    }));
  }
  const slice = duration / n;
  return scenes.map((s, i) => {
    const start = Math.floor(i * slice);
    const end = i === n - 1 ? duration : Math.floor((i + 1) * slice);
    return {
      second: `${start}-${end}`,
      scene: s.scene,
      text: s.text.slice(0, 60),
    };
  });
}

function generateSalesVideoIdeasMock(
  input: GenerateSalesIdeasInput
): SalesVideoIdea[] {
  const duration = Math.min(60, Math.max(30, input.duration ?? 40));
  const brief =
    input.brief ||
    analyzeSalesProduct({
      productName: input.productName,
      description: input.description,
      category: input.category,
      target: input.target,
      analysis: input.analysis,
    });

  const productName =
    input.productName.trim() ||
    input.analysis?.productName ||
    "この商品";
  const pain = painWord(input, brief);
  const targetAudience = brief.targetAudience;
  const target = shortTarget(
    targetAudience,
    brief.productUnderstanding.persona.age
  );
  const point =
    input.sellingPoints?.[0] ||
    brief.sellPoints[0] ||
    input.analysis?.sellingPoints?.[0] ||
    "使いやすさ";
  const category = brief.productUnderstanding.category;
  const solution =
    brief.productUnderstanding.salesAngles[0] ||
    `${productName}で${pain}を解決`;

  const idea1Title =
    category === "美容"
      ? "朝5分で変わる美容習慣"
      : category === "暮らし"
        ? "忙しい朝がラクになる時短習慣"
        : "まだ知らない人、損してます";

  const idea1: SalesVideoIdea = {
    id: "sales-pain-solve-1",
    kind: "pain_solve",
    title: idea1Title,
    target,
    concept: "悩み解決型",
    targetAudience,
    whoFor: `${pain}で困っている人`,
    hook: "これ知らない人、毎朝損しています",
    problem: pain,
    solution: `${productName}で${pain}を解消`,
    videoStyle: "ugc",
    goal: "purchase" as SalesGoal,
    cta: "今すぐチェック",
    reason: `${pain}を抱える${target}に刺さり、商品を解決策として見せられます。`,
    icon: "💡",
    feature: `誰向け：${pain}で困っている人 / 冒頭で損失回避`,
    suitableProducts: category,
    timeline: scaleTimeline(
      [
        { scene: "フック", text: "これ知らない人、毎朝損しています" },
        { scene: "悩み提示", text: `まだ${pain}で時間を無駄にしてませんか？` },
        { scene: "商品紹介", text: `${productName}の登場` },
        { scene: "使用感", text: point },
        { scene: "CTA", text: "今すぐチェック" },
      ],
      duration
    ),
  };

  const idea2: SalesVideoIdea = {
    id: "sales-viral-intro-2",
    kind: "viral_intro",
    title: "バズる発見紹介",
    target,
    concept: "バズ紹介型",
    targetAudience,
    whoFor: "新情報・お得情報を探している人",
    hook: brief.tiktok.openingHooks[0] || "これ知らないと損です",
    problem: "情報が多すぎて本当に良いものが分からない",
    solution: `${productName}のメリットをテンポよく伝える`,
    videoStyle: "ad",
    goal: "affiliate_click" as SalesGoal,
    cta: "プロフィールリンクへ",
    reason:
      "驚き→紹介→メリット→誘導の流れは、視聴維持とアフィリエイトクリックに強いです。",
    icon: "🔥",
    feature: "TikTokで伸びやすい発見・驚き構成",
    suitableProducts: "全カテゴリ（特に話題商品）",
    timeline: scaleTimeline(
      [
        {
          scene: "フック",
          text: brief.tiktok.openingHooks[0] || "これ知らないと損です",
        },
        { scene: "悩み提示", text: "どれを選べばいいか迷う" },
        { scene: "商品紹介", text: `${productName}を紹介` },
        {
          scene: "使用感",
          text: brief.sellPoints.slice(0, 3).join(" / ") || point,
        },
        { scene: "CTA", text: "プロフィールリンクへ" },
      ],
      duration
    ),
  };

  const idea3: SalesVideoIdea = {
    id: "sales-review-trust-3",
    kind: "review_trust",
    title: "正直レビューで信頼を取る",
    target,
    concept: "レビュー信頼型",
    targetAudience,
    whoFor: "買う前に本音レビューを見たい人",
    hook: `正直レビュー。${productName}を使ってみた結果`,
    problem: "広告っぽくて信じられない",
    solution: `使用前→中→後のリアルな変化で信頼を積む`,
    videoStyle: "product_review",
    goal: "brand_awareness" as SalesGoal,
    cta: "詳細を見る",
    reason:
      "使用前→中→後→感想の流れは信頼が高く、検討層の保存・再視聴につながります。",
    icon: "⭐",
    feature: "リアル使用感重視の信頼訴求",
    suitableProducts: "美容・ガジェット・日用品",
    timeline: scaleTimeline(
      [
        { scene: "フック", text: `正直レビュー。${productName}` },
        { scene: "悩み提示", text: `${pain}だった頃` },
        { scene: "商品紹介", text: `${productName}の使い方` },
        { scene: "使用感", text: point },
        { scene: "CTA", text: "詳細を見る" },
      ],
      duration
    ),
  };

  // solution を販売角度で補強
  idea1.solution = solution;
  return [idea1, idea2, idea3];
}

/**
 * 公開エントリ — AI_PROVIDER に応じて切替
 */
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
