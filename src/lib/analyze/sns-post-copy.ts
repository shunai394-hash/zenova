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
    .slice(0, 18);
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
 * （クライアント即時生成・後からLLM差し替え可）
 */
export function buildSnsPostKit(payload: VideoPreviewPayload): SnsPostKit {
  const product = productLabel(payload);
  const hook =
    payload.hook?.trim() ||
    `これ、知らないと損するかも — ${product}`;
  const cta =
    payload.cta?.trim() ||
    "気になった人はプロフィールのリンクからチェック";
  const angle = payload.sellingAngle?.trim() || "";
  const style = payload.style?.trim() || "レビュー";
  const desc =
    payload.productDescription?.trim() ||
    angle ||
    `${product}の魅力を短尺でまとめました。`;
  const tagBase = slugTag(product) || "product";

  const caption = [
    hook,
    "",
    desc.length > 80 ? `${desc.slice(0, 80)}…` : desc,
    "",
    cta,
    "",
    "#PR",
  ].join("\n");

  const tiktokHashtags = [
    "#TikTok",
    "#おすすめ",
    `#${tagBase}`,
    style.includes("UGC") || style.includes("レビュー")
      ? "#本音レビュー"
      : `#${slugTag(style) || "ショート"}`,
    "#アフィリエイト",
    "#PR",
  ].join(" ");

  const tiktokCaption = [
    hook,
    "",
    `${product}、${style}でまとめました。`,
    angle ? `${angle}` : "",
    "",
    cta,
    "保存してあとで見返してね ↑",
  ]
    .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
    .join("\n")
    .trim();

  const youtubeTitle = [
    hook.length <= 50 ? hook : `${product}｜${style}で本音レビュー`,
  ]
    .join("")
    .replace(/\n/g, " ")
    .slice(0, 70);

  const youtubeDescription = [
    `${product}のShortsです。`,
    "",
    desc,
    "",
    `スタイル: ${style}`,
    cta,
    "",
    "#Shorts #レビュー #おすすめ",
  ].join("\n");

  const reelsHashtags = [
    "#Reels",
    "#おすすめ",
    `#${tagBase}`,
    "#PR",
    "#アフィリエイト",
  ].join(" ");

  const reelsDescription = [
    hook,
    "",
    `${product} — ${style}`,
    desc.length > 100 ? `${desc.slice(0, 100)}…` : desc,
    "",
    cta,
    "",
    reelsHashtags,
  ].join("\n");

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
      description: reelsDescription,
      hashtags: reelsHashtags,
      fullPost: reelsDescription,
    },
  };
}
