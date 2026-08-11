import type { VideoStyleId } from "@/lib/analyze/video-settings";
import { normalizeVideoStyleId } from "@/lib/analyze/video-settings";

export type StyleTemplateBeat = {
  timing: string;
  title: string;
  direction: string;
};

/**
 * 動画スタイルごとの制作テンプレート。
 * 生成時に Kling / シナリオ プロンプトへ反映する。
 * 映像演出のみを記述し、実体験・効果・未確認スペックは書かない。
 */
export type StyleVideoTemplate = {
  id: VideoStyleId;
  nameJa: string;
  hookStyle: string;
  ctaStyle: string;
  /** Kling 向けカメラ・演出プロンプト */
  klingPrompt: string;
  /** 台本構成ヒント（日本語） */
  scriptOutline: string;
  beats: StyleTemplateBeat[];
};

export const STYLE_VIDEO_TEMPLATES: Record<VideoStyleId, StyleVideoTemplate> = {
  product_review: {
    id: "product_review",
    nameJa: "商品詳細紹介",
    hookStyle: "商品の寄りカットで特徴を先に見せる",
    ctaStyle: "詳細・購入はプロフのリンクから",
    klingPrompt:
      "product showcase TikTok, creator holding product toward camera, clear close-ups of details, natural light, vertical 9:16",
    scriptOutline: "結論→特徴の見せ方→推しポイント→向いている人→CTA",
    beats: [
      { timing: "0-3", title: "結論", direction: "商品を画面中央に出す" },
      { timing: "3-10", title: "詳細", direction: "手元寄りでポイントを見せる" },
      { timing: "10-end", title: "CTA", direction: "リンク誘導" },
    ],
  },
  ugc: {
    id: "ugc",
    nameJa: "UGC",
    hookStyle: "カメラ目線で商品を手に持つUGC風の構図",
    ctaStyle: "プロフのリンクから同じ商品をチェック",
    klingPrompt:
      "authentic handheld UGC TikTok framing, creator holding product to camera, natural room light, slight shake, vertical 9:16",
    scriptOutline: "自己紹介→悩み→確認済み特徴の見せ方→推しポイント1つ→CTA",
    beats: [
      { timing: "0-3", title: "フック", direction: "顔出し＋商品チラ見せ" },
      { timing: "3-8", title: "紹介", direction: "商品をカメラに向けて見せる" },
      { timing: "8-12", title: "手元", direction: "使用シーンを演出する手元カット" },
      { timing: "12-end", title: "CTA", direction: "リンク誘導" },
    ],
  },
  ad: {
    id: "ad",
    nameJa: "広告風",
    hookStyle: "商品ヒーローショットで世界観を出す",
    ctaStyle: "今すぐチェックはプロフリンクへ",
    klingPrompt:
      "polished commercial TikTok ad, cinematic product hero shots, clean lighting, smooth camera moves, vertical 9:16",
    scriptOutline: "ビジュアルフック→ベネフィット→証拠→CTA",
    beats: [
      { timing: "0-3", title: "ヒーロー", direction: "商品を美しく見せる" },
      { timing: "3-10", title: "魅力", direction: "メリットを短く畳む" },
      { timing: "10-end", title: "CTA", direction: "行動を明確に促す" },
    ],
  },
  before_after: {
    id: "before_after",
    nameJa: "Before After",
    hookStyle: "変化の結論を先出し",
    ctaStyle: "詳細はプロフのリンクから",
    klingPrompt:
      "before-to-after visual contrast cuts, product in frame then lifestyle payoff shot, vertical TikTok",
    scriptOutline: "Before→商品登場→After→要点→CTA",
    beats: [
      { timing: "0-4", title: "Before", direction: "不満状態を見せる" },
      { timing: "4-10", title: "転換", direction: "商品デモの手元カット" },
      { timing: "10-end", title: "After+CTA", direction: "変化を対比で見せる" },
    ],
  },
  compare: {
    id: "compare",
    nameJa: "比較",
    hookStyle: "どっちを買うべき？から入る",
    ctaStyle: "結論の商品はリンクから",
    klingPrompt:
      "side-by-side product comparison, split attention cuts, clear winner reveal, energetic TikTok edit, vertical 9:16",
    scriptOutline: "比較軸提示→Aの弱点→Bの強み→結論→CTA",
    beats: [
      { timing: "0-3", title: "比較軸", direction: "何を比べるか提示" },
      { timing: "3-10", title: "対比", direction: "違いを1〜2点に絞る" },
      { timing: "10-end", title: "結論+CTA", direction: "勝ち商品を明示" },
    ],
  },
  ranking: {
    id: "ranking",
    nameJa: "ランキング",
    hookStyle: "今買うならこの順、から入る",
    ctaStyle: "1位の詳細はプロフリンク",
    klingPrompt:
      "ranking countdown energy, bold product showcase cuts, number overlays feeling, dynamic TikTok pacing, vertical 9:16",
    scriptOutline: "ランキング予告→下位→1位発表→理由→CTA",
    beats: [
      { timing: "0-3", title: "予告", direction: "ランキング形式を宣言" },
      { timing: "3-10", title: "紹介", direction: "ポイントを畳みかける" },
      { timing: "10-end", title: "1位+CTA", direction: "本命商品で締める" },
    ],
  },
};

export function getStyleVideoTemplate(styleId: string): StyleVideoTemplate {
  const id = normalizeVideoStyleId(styleId) ?? "ugc";
  return STYLE_VIDEO_TEMPLATES[id];
}

/**
 * Kling / 動画生成向けに、スタイル演出 + confirmed 事実 + 既存プロンプトを結合する。
 * 商品事実は confirmed のみ。style template から事実・体験を発明しない。
 */
export function buildStyleAwareKlingPrompt(input: {
  videoStyle: string;
  basePrompt?: string | null;
  productName?: string;
  durationSec?: number;
  /** ProductAnalysis.confirmed（商品事実の正本） */
  confirmed?: string[] | null;
  /** ProductAnalysis.excluded（肯定禁止） */
  excluded?: string[] | null;
}): string {
  const tmpl = getStyleVideoTemplate(input.videoStyle);
  const confirmed = (input.confirmed || []).map((c) => c.trim()).filter(Boolean);
  const excluded = (input.excluded || []).map((c) => c.trim()).filter(Boolean);
  const beats = tmpl.beats
    .map((b) => `${b.timing}s ${b.title}: ${b.direction}`)
    .join("; ");
  const parts = [
    tmpl.klingPrompt,
    `template=${tmpl.nameJa}`,
    `visual_hook=${tmpl.hookStyle}`,
    `cta_style=${tmpl.ctaStyle}`,
    `beats=${beats}`,
    input.productName ? `product=${input.productName}` : "",
    input.durationSec ? `duration=${input.durationSec}s` : "",
    confirmed.length
      ? `confirmed_features_only=${confirmed.slice(0, 6).join(", ")}`
      : "confirmed_features_only=none",
    excluded.length
      ? `do_not_claim=${excluded.slice(0, 8).join(", ")}`
      : "",
    "No fabricated specs, ratings, testimonials, or personal experience claims.",
    input.basePrompt?.trim() || "",
  ].filter(Boolean);
  return parts.join(". ");
}

/**
 * シナリオ最適化用の短いテンプレート注釈（日本語）。
 */
export function buildStyleTemplateNote(videoStyle: string): string {
  const tmpl = getStyleVideoTemplate(videoStyle);
  return [
    `【動画テンプレート: ${tmpl.nameJa}】`,
    `フック: ${tmpl.hookStyle}`,
    `構成: ${tmpl.scriptOutline}`,
    `CTA: ${tmpl.ctaStyle}`,
  ].join("\n");
}
