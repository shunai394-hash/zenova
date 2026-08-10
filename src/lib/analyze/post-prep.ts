import type { AiPlanBrief } from "@/lib/analyze/plan-brief";
import type { ProductAnalysis } from "@/lib/product-analysis";

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

/**
 * AI企画書から投稿用キャプション・ハッシュタグ・投稿時間を生成。
 */
export function buildPostPrepSet(input: {
  brief: AiPlanBrief;
  analysis?: ProductAnalysis | null;
  productName?: string;
}): PostPrepSet {
  const { brief } = input;
  const product =
    input.productName?.trim() ||
    input.analysis?.productName?.trim() ||
    "この商品";
  const hook = brief.firstThreeSeconds.trim() || "これ、知らないと損するかも";
  const cta = brief.cta.trim() || "詳しくはプロフのリンクから";
  const pain =
    brief.painPoints
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)[0] || "";

  const captionA = [
    hook,
    "",
    pain ? `正直、${pain}で悩んでた人に試してほしい。` : `${product}、使ってみて驚いた。`,
    "",
    cta,
  ].join("\n");

  const captionB = [
    `【本音レビュー】${product}`,
    "",
    brief.reason.trim() || "短尺で要点だけまとめました。",
    "",
    "保存してあとで見返してね ↑",
    cta,
  ].join("\n");

  const hashtags =
    brief.hashtags.trim() ||
    `#TikTok #おすすめ #${product.replace(/\s+/g, "")} #PR #アフィリエイト`;

  // TikTok JP の反応が取りやすい帯（ヒューリスティック）
  const postTime =
    "おすすめ投稿時間（JST）: 平日 12:00 / 19:00〜21:00 · 休日 11:00 / 20:00〜22:00";

  return { captionA, captionB, hashtags, postTime };
}
