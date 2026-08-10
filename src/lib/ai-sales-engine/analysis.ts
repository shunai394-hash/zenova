/**
 * 商品分析（販売企画書）— mock 実装
 * OpenAI 接続時は openai/analysis.ts を呼び出す。
 */

import type { ProductAnalysis } from "@/lib/product-analysis";
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

function resolveCategoryLabel(
  category: string | null | undefined,
  blob: string
): string {
  const c = (category || "").trim();
  if (c && c !== "その他") {
    if (/ビューティー|美容|コスメ/.test(c)) return "美容";
    if (/ガジェット|電子/.test(c)) return "ガジェット";
    if (/ライフ|暮らし|ホーム|生活|掃除|キッチン/.test(c)) return "暮らし";
    if (/フード|食品|食/.test(c)) return "食品";
    if (/ファッション|服/.test(c)) return "ファッション";
    if (/ヘルス|健康/.test(c)) return "健康";
    return c;
  }
  const b = blob.toLowerCase();
  if (/美容|コスメ|スキン|メイク|beauty/.test(b)) return "美容";
  if (/ガジェット|gadget|スマホ|イヤホン|充電/.test(b)) return "ガジェット";
  if (/掃除|収納|キッチン|暮らし|生活|時短/.test(b)) return "暮らし";
  if (/食品|フード|お菓子|飲料/.test(b)) return "食品";
  if (/ファッション|服|靴/.test(b)) return "ファッション";
  if (/健康|ダイエット|サプリ/.test(b)) return "健康";
  return "暮らし";
}

function buildPersona(input: {
  category: string;
  targetAudience: string;
  pain: string;
  blob: string;
}): BuyerPersonaProfile {
  const { category, targetAudience, pain, blob } = input;
  if (category === "美容" || /美容|肌/.test(blob)) {
    return {
      name: "美咲",
      age: "28歳",
      lifestyle: "仕事帰りのスキンケアを短縮したい会社員",
      pain: pain || "朝の準備に時間がかかる",
    };
  }
  if (category === "暮らし" || /時短|主婦/.test(blob)) {
    return {
      name: "あかり",
      age: "34歳",
      lifestyle: "育児と家事で忙しい共働き主婦",
      pain: pain || "家事が終わらない",
    };
  }
  if (category === "ガジェット") {
    return {
      name: "健太",
      age: "32歳",
      lifestyle: "スマホ中心で効率を求める会社員",
      pain: pain || "どれを選べばいいか分からない",
    };
  }
  const ageMatch = targetAudience.match(/(\d{2})/);
  return {
    name: "ゆい",
    age: ageMatch ? `${ageMatch[1]}歳前後` : "20〜30代",
    lifestyle: `${targetAudience}で、短尺動画から買い物する`,
    pain: pain || "失敗したくない",
  };
}

function buildSalesAngles(input: {
  category: string;
  targetAudience: string;
  purchaseReasons: string[];
  blob: string;
}): string[] {
  const { category, targetAudience, purchaseReasons, blob } = input;
  const angles: string[] = [];
  if (/時短|忙しい|すぐ/.test(blob) || purchaseReasons.includes("時間短縮")) {
    angles.push("忙しい人向け時短アイテム");
  }
  if (category === "美容" || /20|30|女性/.test(targetAudience)) {
    angles.push("美容意識が高い20〜30代女性向け");
  }
  if (/プレ|ギフト|贈/.test(blob)) {
    angles.push("プレゼント需要向け");
  }
  if (category === "ガジェット") {
    angles.push("比較検討中のガジェット好き向け");
  }
  if (angles.length === 0) {
    angles.push(`${targetAudience}向けの悩み解決アイテム`);
  }
  if (angles.length < 2) {
    angles.push("SNSで発見→即検討につなげる導線向け");
  }
  if (angles.length < 3 && !angles.some((a) => a.includes("プレゼント"))) {
    angles.push("プレゼント需要向け");
  }
  return angles.slice(0, 3);
}

function buildProductUnderstanding(input: {
  category: string;
  analysis?: ProductAnalysis | null;
  target?: string;
  blob: string;
}): ProductUnderstanding {
  const { category, analysis, target, blob } = input;
  const buyers: string[] = [];
  const personaText =
    analysis?.buyerPersona?.trim() ||
    analysis?.targetInsight?.trim() ||
    target?.trim() ||
    "20〜40代女性";
  buyers.push(personaText.split(/[、,]/)[0]?.trim() || personaText);
  if (/主婦|ママ|育児/.test(blob) || category === "暮らし") {
    buyers.push("忙しい主婦");
  }
  if (/ガジェット|スマホ|イヤホン/.test(blob) || category === "ガジェット") {
    buyers.push("スマホ利用者");
  }
  if (buyers.length < 2) buyers.push("情報収集中の購入検討層");
  if (buyers.length < 3) buyers.push("短尺動画で比較したい人");

  const purchaseReasons =
    (analysis?.purchaseReasons?.filter(Boolean).slice(0, 3).length
      ? analysis.purchaseReasons.filter(Boolean).slice(0, 3)
      : null) ||
    inferPurchaseReasons(category, blob, analysis);

  const painPoints =
    analysis?.painPoints?.filter(Boolean).slice(0, 3) ||
    [purchaseReasons[0] ? `${purchaseReasons[0]}できていない` : "毎日の手間"].concat(
      ["どれを選べばいいか迷う", "効果が分からない"].slice(
        0,
        Math.max(0, 3 - (analysis?.painPoints?.length || 1))
      )
    );

  const differentiators =
    (analysis?.differentiation?.filter(Boolean).slice(0, 4).length
      ? analysis.differentiation.filter(Boolean).slice(0, 4)
      : null) || ["使いやすさ", "機能", "見た目", "価格"];

  const targetAudience = personaText;
  const persona = buildPersona({
    category,
    targetAudience,
    pain: painPoints[0] || "毎日の手間",
    blob,
  });

  const salesAngles = buildSalesAngles({
    category,
    targetAudience,
    purchaseReasons,
    blob,
  });

  return {
    category,
    buyers: [...new Set(buyers)].slice(0, 3),
    purchaseReasons: purchaseReasons.slice(0, 3),
    painPoints: [...new Set(painPoints)].slice(0, 3),
    differentiators: differentiators.slice(0, 4).map((d) => {
      if (/価格|コスパ|安い/.test(d)) return "価格";
      if (/機能|性能|スペック/.test(d)) return "機能";
      if (/見た目|デザイン|おしゃれ/.test(d)) return "見た目";
      if (/使い|簡単|時短/.test(d)) return "使いやすさ";
      return d.length > 16 ? d.slice(0, 16) : d;
    }),
    salesAngles,
    persona,
  };
}

function inferPurchaseReasons(
  category: string,
  blob: string,
  analysis?: ProductAnalysis | null
): string[] {
  const reasons: string[] = [];
  if (analysis?.painPoints?.[0]) reasons.push("悩み解決");
  if (/時短|忙しい|すぐ/.test(blob) || category === "暮らし") {
    reasons.push("時間短縮");
  }
  if (/便利|簡単|ラク/.test(blob)) reasons.push("便利さ");
  if (/美容|肌|きれ/.test(blob) || category === "美容") {
    reasons.push("見た目・印象アップ");
  }
  if (reasons.length === 0) {
    reasons.push("悩み解決", "便利さ", "時間短縮");
  }
  while (reasons.length < 3) {
    const extras = ["コスパ", "信頼感", "話題性"];
    for (const e of extras) {
      if (!reasons.includes(e)) reasons.push(e);
      if (reasons.length >= 3) break;
    }
  }
  return reasons.slice(0, 3);
}

function buildTikTokAnalysis(input: {
  score: number;
  category: string;
  analysis?: ProductAnalysis | null;
  productName: string;
}): TikTokSalesAnalysis {
  const { score, category, analysis, productName } = input;
  const stars = Math.max(1, Math.min(5, Math.round(score / 20)));

  const triggers: string[] = [];
  const angle = analysis?.salesAngle || "";
  const points = (analysis?.sellingPoints || []).join(" ");
  if (/驚|知ら|損|まさか/.test(angle + points)) triggers.push("驚き");
  if (/便利|時短|簡単|ラク/.test(angle + points) || category === "暮らし") {
    triggers.push("便利");
  }
  if (/比較|どっち|vs/.test(angle)) triggers.push("比較");
  if (/変化|Before|After|ビフォー|効果/.test(angle + points) || category === "美容") {
    triggers.push("変化");
  }
  if (triggers.length === 0) {
    triggers.push("驚き", "便利", "変化");
  }
  while (triggers.length < 3) {
    for (const t of ["比較", "信頼", "お得"]) {
      if (!triggers.includes(t)) triggers.push(t);
      if (triggers.length >= 4) break;
    }
    break;
  }

  const pain = analysis?.painPoints?.[0] || "毎日の手間";
  const openingHooks = [
    "これ知らないと損です",
    `毎日の${pain.length > 8 ? "○○" : pain}が変わる`,
    analysis?.recommendedVideoStructure?.[0]
      ?.replace(/^\d+[\.．\s]*/, "")
      .slice(0, 28) || `${productName}、最初の3秒だけ見て`,
  ].filter(Boolean);

  return {
    hookPowerStars: stars,
    emotionTriggers: [...new Set(triggers)].slice(0, 4),
    openingHooks: openingHooks.slice(0, 3),
  };
}

function buildVideoScore(input: {
  score: number;
  understanding: ProductUnderstanding;
  analysis?: ProductAnalysis | null;
  blob: string;
}): SalesVideoScore {
  let videoReady = input.score;
  const reasons: string[] = [];

  if (input.understanding.painPoints.length > 0) {
    videoReady += 4;
    reasons.push("悩みが明確");
  }
  if (
    /変化|Before|After|ビフォー|効果/.test(input.blob) ||
    input.understanding.category === "美容" ||
    input.understanding.category === "暮らし"
  ) {
    videoReady += 5;
    reasons.push("Before Afterが作りやすい");
  }
  if (input.understanding.purchaseReasons.includes("時間短縮")) {
    videoReady += 3;
    reasons.push("時短訴求が短尺向き");
  }
  reasons.push("SNS向き");

  if (reasons.length < 3) {
    reasons.push("購入理由がはっきりしている");
  }

  videoReady = Math.max(0, Math.min(100, Math.round(videoReady)));
  const suitabilityStars = Math.max(
    1,
    Math.min(5, Math.round(videoReady / 20))
  );

  return {
    suitabilityStars,
    videoReadyScore: videoReady,
    reasons: [...new Set(reasons)].slice(0, 4),
  };
}

/** mock 本体 */
export function analyzeSalesProductMock(
  input: AnalyzeSalesProductInput
): SalesBrief {
  const analysis = input.analysis ?? null;
  const productName =
    input.productName.trim() || analysis?.productName || "この商品";
  const blob = [
    productName,
    input.description || "",
    analysis?.summary || "",
    analysis?.salesAngle || "",
    ...(analysis?.sellingPoints || []),
  ].join(" ");

  const category = resolveCategoryLabel(input.category, blob);
  const score = analysis?.salesScore?.total ?? 78;
  const targetAudience =
    analysis?.targetInsight?.trim() ||
    input.target?.trim() ||
    analysis?.buyerPersona?.trim() ||
    "20〜40代女性";

  const sellPoints = [
    ...(analysis?.sellingPoints || []).slice(0, 2),
    ...(analysis?.painPoints || []).slice(0, 1).map((p) => `悩み解決: ${p}`),
  ]
    .filter(Boolean)
    .slice(0, 3);

  const recommendedFormat = input.recommendedFormat || "ugc";
  const recommendedFormatLabel =
    input.recommendedFormatLabel || recommendedFormat;

  const reason =
    analysis?.salesScore?.tips?.[0]?.trim() ||
    analysis?.salesAngle?.trim() ||
    "短時間で効果が伝わりやすいため";

  const productUnderstanding = buildProductUnderstanding({
    category,
    analysis,
    target: targetAudience,
    blob,
  });

  const tiktok = buildTikTokAnalysis({
    score,
    category,
    analysis,
    productName,
  });

  const videoScore = buildVideoScore({
    score,
    understanding: productUnderstanding,
    analysis,
    blob,
  });

  return {
    score,
    scoreLabel: analysis?.salesScore?.label || "売れる可能性",
    targetAudience,
    sellPoints:
      sellPoints.length > 0
        ? sellPoints
        : ["使用前後比較ができる", "悩み解決型に向いている"],
    recommendedFormat,
    recommendedFormatLabel,
    reason,
    productUnderstanding,
    tiktok,
    videoScore,
  };
}

/**
 * 公開エントリ — AI_PROVIDER に応じて実装を切替
 */
export function analyzeSalesProduct(
  input: AnalyzeSalesProductInput
): SalesBrief {
  const provider = resolveAiSalesProviderId();
  if (provider === "openai") {
    // 将来: return await analyzeSalesProductOpenAI(input)
    // 未接続時は mock にフォールバック
    console.info(
      "[ai-sales-engine] AI_PROVIDER=openai だが未接続のため mock を使用"
    );
  }
  return analyzeSalesProductMock(input);
}
