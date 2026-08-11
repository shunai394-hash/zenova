import type { AiPlanBrief } from "@/lib/analyze/plan-brief";
import type { ProductAnalysis } from "@/lib/product-analysis";
import { normalizeProductAnalysis } from "@/lib/product-analysis/engine";
import {
  buildSourceBlob,
  containsHypeClaim,
} from "@/lib/product-analysis/claim-guard";
import {
  getClaimBucketsFromAnalysis,
  sanitizeIdeaText,
} from "@/lib/product-analysis/factual-gate";

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
 * 商品事実は confirmed のみ。効果・実績・偽レビューを新規生成しない。
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
  const sourceBlob = buildSourceBlob({
    productName: product,
    description: analysis?.summary,
  });
  const buckets = analysis
    ? getClaimBucketsFromAnalysis(analysis)
    : {
        confirmed: [],
        inferred: [],
        unknown: [],
        excluded: [],
        notSupported: [],
      };

  const rawHook = brief.firstThreeSeconds.trim() || analysis?.recommendedHooks?.[0] || "";
  const hook =
    (analysis
      ? sanitizeIdeaText(rawHook, analysis, sourceBlob)
      : rawHook) || `${product}の入力情報を短尺でまとめました`;

  let cta = brief.cta.trim() || analysis?.cta || "詳しくはプロフのリンクから";
  if (containsHypeClaim(cta) || /No\.?1|売れて|人気/.test(cta)) {
    cta = "詳しくはプロフのリンクから";
  }

  const painRaw =
    brief.painPoints
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)[0] ||
    analysis?.painPoints?.[0] ||
    "";
  const pain = analysis
    ? sanitizeIdeaText(painRaw, analysis, sourceBlob)
    : painRaw;

  const features = (buckets.confirmed.length
    ? buckets.confirmed
    : analysis?.productFeatures || []
  )
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

  const reasonRaw =
    brief.reason.trim() ||
    analysis?.salesAngle ||
    "商品情報をもとにポイントを整理しました。";
  const reason = analysis
    ? sanitizeIdeaText(reasonRaw, analysis, sourceBlob) ||
      "商品情報をもとにポイントを整理しました。"
    : reasonRaw;

  const captionB = [
    hasReview ? `【紹介＋レビュー補足】${product}` : `【商品紹介】${product}`,
    "",
    reason,
    features ? `特徴: ${features}` : "",
    "",
    "保存してあとで見返してね",
    cta,
  ]
    .filter(Boolean)
    .join("\n");

  const featureTags = (buckets.confirmed || [])
    .slice(0, 3)
    .map((f) => `#${slugTag(f)}`)
    .filter((t) => t.length > 2);

  const rawTags = brief.hashtags.trim();
  const safeTags = rawTags
    .split(/\s+/)
    .filter((t) => t && !/人気|売れて|No1|ランキング/.test(t))
    .join(" ");

  const hashtags =
    safeTags ||
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
