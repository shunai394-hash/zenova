import type { AiPlanBrief } from "@/lib/analyze/plan-brief";
import type { ProductAnalysis } from "@/lib/product-analysis";
import { normalizeProductAnalysis } from "@/lib/product-analysis/engine";

/** 投稿準備セット（TikTok投稿用のテキスト一式） */
export type PostPrepSet = {
  captionA: string;
  captionB: string;
  hashtags: string;
  /** 推奨投稿時間帯（表示用） */
  postTime: string;
};

export function emptyPostPrepSet(): PostPrepSet {
  return {
    captionA: "",
    captionB: "",
    hashtags: "",
    postTime: "",
  };
}

function slugTag(value: string): string {
  return value
    .replace(/[^\w\u3040-\u30ff\u30a0-\u30ff\u4e00-\u9fff]+/g, "")
    .slice(0, 14);
}

/**
 * 選択中の企画書 + ProductAnalysis から投稿文を生成。
 * 汎用「損しています」「本音レビュー」は使わない。
 */
export function buildPostPrepSet(input: {
  brief: AiPlanBrief;
  analysis?: ProductAnalysis | null;
  productName?: string;
}): PostPrepSet {
  const { brief } = input;
  const analysis = input.analysis
    ? normalizeProductAnalysis(input.analysis)
    : null;
  const product =
    input.productName?.trim() ||
    analysis?.productName?.trim() ||
    "この商品";
  const hook =
    brief.firstThreeSeconds.trim() ||
    analysis?.recommendedHooks?.[0] ||
    `${product}の特徴を短尺でまとめました`;
  const cta = brief.cta.trim() || analysis?.cta || "詳しくはプロフのリンクから";
  const pain =
    brief.painPoints
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)[0] ||
    analysis?.painPoints?.[0] ||
    "";
  const features = (analysis?.productFeatures || analysis?.sellingPoints || [])
    .slice(0, 3)
    .join(" / ");
  const target = brief.target.trim() || analysis?.target || "";
  const hasReview = Boolean(analysis?.hasUserReview);

  const captionA = [
    hook,
    "",
    pain ? `${target ? `${target}向け。` : ""}${pain}` : "",
    features ? `ポイント: ${features}` : "",
    "",
    cta,
  ]
    .filter((line, i, arr) => line !== "" || (arr[i - 1] && arr[i - 1] !== ""))
    .join("\n")
    .trim();

  const captionB = [
    hasReview ? `【紹介＋レビュー補足】${product}` : `【商品紹介】${product}`,
    "",
    brief.reason.trim() ||
      analysis?.salesAngle ||
      "商品情報をもとにポイントを整理しました。",
    features ? `特徴: ${features}` : "",
    "",
    "保存してあとで見返してね",
    cta,
  ]
    .filter(Boolean)
    .join("\n");

  const featureTags = (analysis?.productFeatures || [])
    .slice(0, 3)
    .map((f) => `#${slugTag(f)}`)
    .filter((t) => t.length > 2);

  const hashtags =
    brief.hashtags.trim() ||
    [
      "#TikTok",
      analysis?.category ? `#${slugTag(analysis.category)}` : "#おすすめ",
      ...featureTags,
      /通勤|会社員/.test(target) ? "#通勤" : "",
      "#PR",
    ]
      .filter(Boolean)
      .join(" ");

  const postTime =
    "おすすめ投稿時間（JST）: 平日 12:00 / 19:00〜21:00 · 休日 11:00 / 20:00〜22:00";

  return { captionA, captionB, hashtags, postTime };
}
