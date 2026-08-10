import type { ProductAnalysis } from "@/lib/product-analysis";

/** Analyze上でユーザーが編集する動画制作ドラフト */
export type CreativeDraft = {
  target: string;
  hook: string;
  script: string;
  cta: string;
  hashtags: string;
};

export function emptyCreativeDraft(): CreativeDraft {
  return {
    target: "",
    hook: "",
    script: "",
    cta: "",
    hashtags: "",
  };
}

function slugTag(value: string): string {
  return value
    .replace(/[^\w\u3040-\u30ff\u30a0-\u30ff\u4e00-\u9fff]+/g, "")
    .slice(0, 20);
}

/**
 * AI分析結果から、編集可能なクリエイティブ初期値を生成する。
 */
export function buildCreativeDraft(input: {
  analysis: ProductAnalysis;
  formTarget?: string;
  platform?: string;
}): CreativeDraft {
  const { analysis } = input;
  const platform = (input.platform || "TikTok").trim() || "TikTok";
  const formTarget = (input.formTarget || "").trim();

  const target =
    analysis.targetInsight?.trim() ||
    formTarget ||
    analysis.buyerPersona?.trim() ||
    "";

  const structure = analysis.recommendedVideoStructure ?? [];
  const earlyBeats = structure.slice(0, 2);
  const hook =
    earlyBeats.join(" / ").trim() ||
    `最初の3秒: ${analysis.painPoints?.[0] ?? analysis.salesAngle}`.trim();

  const scriptLines = [
    `【フック】${hook}`,
    "",
    "【本編】",
    ...structure.map((line) => `・${line}`),
    "",
    `【CTA】${analysis.cta}`,
  ];
  const script = scriptLines.filter(Boolean).join("\n");

  const cta = analysis.cta?.trim() || analysis.ctaIdeas?.[0] || "";

  const nameTag = slugTag(analysis.productName || "product");
  const hashtags = [
    "#TikTok",
    platform === "Instagram Reels"
      ? "#Reels"
      : platform === "YouTube Shorts"
        ? "#Shorts"
        : "#おすすめ",
    nameTag ? `#${nameTag}` : "#商品紹介",
    "#アフィリエイト",
    "#PR",
  ].join(" ");

  return {
    target,
    hook,
    script,
    cta,
    hashtags,
  };
}
