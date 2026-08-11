import type { ProductAnalysis } from "@/lib/product-analysis";
import { normalizeProductAnalysis } from "@/lib/product-analysis/engine";

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
    hint: "この商品で動画を作る価値の目安（AI推定）",
    rows: 2,
  },
  {
    key: "confidence",
    label: "確信度",
    hint: "分析の確からしさ（参考）",
    rows: 1,
  },
  {
    key: "target",
    label: "ターゲット",
    hint: "誰に届けるか（入力優先）",
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
    .slice(0, 16);
}

function confidenceFromAnalysis(analysis: ProductAnalysis): string {
  const b = analysis.salesScore?.breakdown;
  const avg = Math.round(
    b
      ? (b.clarity +
          b.demandFit +
          b.differentiation +
          b.creativePotential +
          b.conversionReadiness) /
          5
      : analysis.salesScore?.total ?? 50
  );
  const level = avg >= 75 ? "高" : avg >= 55 ? "中" : "低";
  return `${level}（${avg}%・参考）`;
}

/**
 * 分析結果 → AI企画書の初期値。
 * 入力ターゲットを最優先し、ProductAnalysis を正本にする。
 */
export function buildAiPlanBrief(input: {
  analysis: ProductAnalysis;
  formTarget?: string;
  platform?: string;
}): AiPlanBrief {
  const analysis = normalizeProductAnalysis(input.analysis);
  const platform =
    (input.platform || analysis.platform || "TikTok").trim() || "TikTok";
  const formTarget = (input.formTarget || "").trim();
  const score = analysis.salesScore;

  const target =
    formTarget ||
    analysis.target?.trim() ||
    analysis.buyerPersonaDetail?.occupation ||
    analysis.targetInsight?.trim() ||
    "";

  const firstThreeSeconds =
    analysis.recommendedHooks?.[0]?.trim() ||
    (analysis.painPoints?.[0]
      ? `${analysis.painPoints[0].replace(/。$/, "")}？`
      : `最初の3秒で「${analysis.productFeatures?.[0] || analysis.productName}」を見せる`);

  const structure = (analysis.recommendedVideoStructure ?? [])
    .map((line, i) => `${i + 1}. ${line}`)
    .join("\n");

  const cta =
    analysis.cta?.trim() || analysis.ctaIdeas?.[0]?.trim() || "";

  const reasonParts = [
    analysis.salesAngle?.trim(),
    score.scoreNote || "スコアはAI推定（参考値）",
    score.label ? `目安: ${score.label}（Grade ${score.grade}）` : "",
  ].filter(Boolean);

  const cautionParts = [
    ...(analysis.uncertainty ?? []),
    ...(score.tips ?? []).slice(0, 2),
    analysis.hasUserReview
      ? ""
      : "実使用レビュー未入力のため、体験談を装う表現は使わない",
    "景表法・薬機法に抵触する断定表現は避けてください",
  ].filter(Boolean);

  const featureTags = (analysis.productFeatures || [])
    .slice(0, 3)
    .map((f) => `#${slugTag(f)}`)
    .filter((t) => t.length > 2);

  const hashtags = [
    platform === "Instagram Reels"
      ? "#Reels"
      : platform === "YouTube Shorts"
        ? "#Shorts"
        : "#TikTok",
    analysis.category ? `#${slugTag(analysis.category)}` : "",
    ...featureTags,
    /通勤|会社員/.test(target) ? "#通勤" : "",
    "#PR",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    recommendationScore: `${score.total}/100 · Grade ${score.grade}（AI推定）`,
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
  if (brief.painPoints.trim()) parts.push(`【悩み】\n${brief.painPoints.trim()}`);
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
