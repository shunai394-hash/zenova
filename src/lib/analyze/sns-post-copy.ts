import type { VideoPreviewPayload } from "@/lib/analyze/preview-session";

/** SNS別の投稿用テキストキット */
export type SnsPostKit = {
  /** 共通のAI生成キャプション本文 */
  caption: string;
  tiktok: {
    caption: string;
    hashtags: string;
    /** キャプション + ハッシュタグ（投稿用一式） */
    fullPost: string;
  };
  youtubeShorts: {
    title: string;
    description: string;
  };
  instagramReels: {
    description: string;
    hashtags: string;
    fullPost: string;
  };
};

function slugTag(value: string): string {
  return value
    .replace(/[^\w\u3040-\u30ff\u30a0-\u30ff\u4e00-\u9fff]+/g, "")
    .slice(0, 14);
}

function productLabel(payload: VideoPreviewPayload): string {
  return (
    payload.productName?.trim() ||
    payload.title?.trim() ||
    "おすすめ商品"
  );
}

/**
 * 生成動画メタから、各SNS向け投稿文を組み立てる。
 * 選択企画の hook / cta / angle を優先し、汎用煽り・偽レビューを避ける。
 */
export function buildSnsPostKit(payload: VideoPreviewPayload): SnsPostKit {
  const product = productLabel(payload);
  const hook =
    payload.hook?.trim() ||
    `${product}の特徴を短尺でまとめました`;
  const cta =
    payload.cta?.trim() ||
    "気になった人はプロフィールのリンクからチェック";
  const angle = payload.sellingAngle?.trim() || "";
  const style = payload.style?.trim() || "商品紹介";
  const desc =
    payload.productDescription?.trim() ||
    angle ||
    `${product}のポイントを整理しました。`;
  const tagBase = slugTag(product) || "product";

  const caption = [
    hook,
    "",
    desc.length > 100 ? `${desc.slice(0, 100)}…` : desc,
    "",
    cta,
    "",
    "#PR",
  ].join("\n");

  const tiktokHashtags = [
    "#TikTok",
    `#${tagBase}`,
    /通勤/.test(desc + hook) ? "#通勤" : "#おすすめ",
    style.includes("比較") ? "#選び方" : "#商品紹介",
    "#PR",
  ].join(" ");

  const tiktokCaption = [
    hook,
    "",
    `${product} — ${style}でポイント整理。`,
    angle ? `${angle}` : "",
    "",
    cta,
    "保存してあとで見返してね",
  ]
    .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
    .join("\n")
    .trim();

  const youtubeTitle = (
    hook.length <= 50 ? hook : `${product}｜${style}`
  )
    .replace(/\n/g, " ")
    .slice(0, 70);

  const youtubeDescription = [
    `${product}のShortsです。`,
    angle || desc.slice(0, 120),
    "",
    cta,
    "",
    "#Shorts #PR",
  ].join("\n");

  const igHashtags = [
    "#Reels",
    `#${tagBase}`,
    "#商品紹介",
    "#PR",
  ].join(" ");

  const igDescription = [hook, "", desc.slice(0, 120), "", cta].join("\n");

  return {
    caption,
    tiktok: {
      caption: tiktokCaption,
      hashtags: tiktokHashtags,
      fullPost: `${tiktokCaption}\n\n${tiktokHashtags}`,
    },
    youtubeShorts: {
      title: youtubeTitle,
      description: youtubeDescription,
    },
    instagramReels: {
      description: igDescription,
      hashtags: igHashtags,
      fullPost: `${igDescription}\n\n${igHashtags}`,
    },
  };
}
