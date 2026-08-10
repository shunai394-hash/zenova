import type { ProductAnalysis } from "@/lib/product-analysis";

/**
 * AI企画書 — Analyze 分析結果をマーケティングプランとして編集可能にする。
 * 動画生成時は hook / script / cta / target にマッピングする。
 */
export type AiPlanBrief = {
  /** おすすめ度（例: 82/100 · Grade A） */
  recommendationScore: string;
  /** 確信度（例: 高（78%）） */
  confidence: string;
  /** ターゲット */
  target: string;
  /** 悩み */
  painPoints: string;
  /** 最初の3秒 */
  firstThreeSeconds: string;
  /** おすすめ構成 */
  structure: string;
  /** CTA */
  cta: string;
  /** おすすめ理由 */
  reason: string;
  /** 注意点 */
  cautions: string;
  /** 生成用（UI非表示でも保持） */
  hashtags: string;
};

export const AI_PLAN_BRIEF_FIELDS = [
  {
    key: "recommendationScore",
    label: "おすすめ度",
    hint: "この商品で動画を作る価値の目安",
    rows: 2,
  },
  {
    key: "confidence",
    label: "確信度",
    hint: "分析の確からしさ",
    rows: 1,
  },
  {
    key: "target",
    label: "ターゲット",
    hint: "誰に届けるか",
    rows: 2,
  },
  {
    key: "painPoints",
    label: "悩み",
    hint: "顧客が抱えている課題",
    rows: 3,
  },
  {
    key: "firstThreeSeconds",
    label: "最初の3秒",
    hint: "スクロールを止める冒頭",
    rows: 2,
  },
  {
    key: "structure",
    label: "おすすめ構成",
    hint: "動画の流れ・ビート",
    rows: 5,
  },
  {
    key: "cta",
    label: "CTA",
    hint: "最後の行動誘導",
    rows: 2,
  },
  {
    key: "reason",
    label: "おすすめ理由",
    hint: "なぜこの企画か",
    rows: 3,
  },
  {
    key: "cautions",
    label: "注意点",
    hint: "表現・コンプラ・改善のポイント",
    rows: 3,
  },
] as const satisfies ReadonlyArray<{
  key: keyof AiPlanBrief;
  label: string;
  hint: string;
  rows: number;
}>;

export function emptyAiPlanBrief(): AiPlanBrief {
  return {
    recommendationScore: "",
    confidence: "",
    target: "",
    painPoints: "",
    firstThreeSeconds: "",
    structure: "",
    cta: "",
    reason: "",
    cautions: "",
    hashtags: "",
  };
}

function slugTag(value: string): string {
  return value
    .replace(/[^\w\u3040-\u30ff\u30a0-\u30ff\u4e00-\u9fff]+/g, "")
    .slice(0, 20);
}

function confidenceFromAnalysis(analysis: ProductAnalysis): string {
  const b = analysis.salesScore.breakdown;
  const avg = Math.round(
    (b.clarity +
      b.demandFit +
      b.differentiation +
      b.creativePotential +
      b.conversionReadiness) /
      5
  );
  const level = avg >= 75 ? "高" : avg >= 55 ? "中" : "低";
  return `${level}（${avg}%）`;
}

/**
 * 分析結果 → AI企画書の初期値。
 */
export function buildAiPlanBrief(input: {
  analysis: ProductAnalysis;
  formTarget?: string;
  platform?: string;
}): AiPlanBrief {
  const { analysis } = input;
  const platform = (input.platform || "TikTok").trim() || "TikTok";
  const formTarget = (input.formTarget || "").trim();
  const score = analysis.salesScore;

  const target =
    analysis.targetInsight?.trim() ||
    formTarget ||
    analysis.buyerPersona?.trim() ||
    "";

  const structureLines = analysis.recommendedVideoStructure ?? [];
  const firstThreeSeconds =
    structureLines[0]?.trim() ||
    (analysis.painPoints?.[0]
      ? `これ、${analysis.painPoints[0]}で悩んでない？`
      : `最初の3秒: ${analysis.salesAngle}`.trim());

  const structure = structureLines
    .map((line, i) => `${i + 1}. ${line}`)
    .join("\n");

  const cta =
    analysis.cta?.trim() || analysis.ctaIdeas?.[0]?.trim() || "";

  const reasonParts = [
    analysis.salesAngle?.trim(),
    score.label ? `販売スコアは ${score.label}（${score.grade}）` : "",
    score.tips?.[0]?.trim(),
  ].filter(Boolean);

  const cautionParts = [
    ...(score.tips ?? []).slice(1, 4),
    analysis.offerStyle
      ? `オファー表現「${analysis.offerStyle}」は誇大にならないよう注意`
      : "",
    "景表法・薬機法に抵触する断定表現は避けてください",
  ].filter(Boolean);

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
    recommendationScore: `${score.total}/100 · Grade ${score.grade}（${score.label}）`,
    confidence: confidenceFromAnalysis(analysis),
    target,
    painPoints: (analysis.painPoints ?? []).join("\n"),
    firstThreeSeconds,
    structure,
    cta,
    reason: reasonParts.join("。"),
    cautions: cautionParts.join("\n"),
    hashtags,
  };
}

/** 動画生成 API 向けに企画書をクリエイティブ項目へ変換 */
export function planBriefToCreativePayload(brief: AiPlanBrief): {
  target: string;
  hook: string;
  script: string;
  cta: string;
  hashtags: string;
} {
  const hook = brief.firstThreeSeconds.trim();
  const structure = brief.structure.trim();
  const cta = brief.cta.trim();
  const parts: string[] = [];
  if (hook) parts.push(`【フック】${hook}`);
  if (structure) parts.push(`【本編】\n${structure}`);
  if (cta) parts.push(`【CTA】${cta}`);

  return {
    target: brief.target.trim(),
    hook,
    script: parts.join("\n\n"),
    cta,
    hashtags: brief.hashtags.trim(),
  };
}
