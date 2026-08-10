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
    nameJa: "商品レビュー",
    hookStyle: "正直レビュー、使ってみた結果から入る",
    ctaStyle: "詳細・購入はプロフのリンクから",
    klingPrompt:
      "product review TikTok, creator showing product details and daily usage, clear close-ups, natural light, vertical 9:16",
    scriptOutline: "結論→使用感→推しポイント→向いている人→CTA",
    beats: [
      { timing: "0-3", title: "結論", direction: "買ってよかった一言" },
      { timing: "3-10", title: "レビュー", direction: "使用感を具体的に" },
      { timing: "10-end", title: "CTA", direction: "リンク誘導" },
    ],
  },
  ugc: {
    id: "ugc",
    nameJa: "UGC",
    hookStyle: "カメラ目線で本音レビュー開始",
    ctaStyle: "プロフのリンクから同じ商品をチェック",
    klingPrompt:
      "authentic handheld UGC TikTok, creator speaking to camera, natural room light, product in hand, slight shake, vertical 9:16",
    scriptOutline:
      "自己紹介→悩み→使ってみた感想→推しポイント1つ→CTA",
    beats: [
      { timing: "0-3", title: "フック", direction: "顔出し＋商品チラ見せ" },
      { timing: "3-8", title: "本音", direction: "使ってよかった点を話す" },
      { timing: "8-12", title: "証拠", direction: "使用シーンの手元カット" },
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
    ctaStyle: "同じ変化を試すならリンクへ",
    klingPrompt:
      "before-to-after transformation, clear contrast cuts, product usage then payoff lifestyle shot, vertical TikTok",
    scriptOutline: "Before→商品介入→After→要点→CTA",
    beats: [
      { timing: "0-4", title: "Before", direction: "不満状態を見せる" },
      { timing: "4-10", title: "転換", direction: "使用デモ" },
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
 * Kling / 動画生成向けに、テンプレート＋既存プロンプトを結合する。
 */
export function buildStyleAwareKlingPrompt(input: {
  videoStyle: string;
  basePrompt?: string | null;
  productName?: string;
  durationSec?: number;
}): string {
  const tmpl = getStyleVideoTemplate(input.videoStyle);
  const beats = tmpl.beats
    .map((b) => `${b.timing}s ${b.title}: ${b.direction}`)
    .join("; ");
  const parts = [
    tmpl.klingPrompt,
    `template=${tmpl.nameJa}`,
    `hook_style=${tmpl.hookStyle}`,
    `cta_style=${tmpl.ctaStyle}`,
    `beats=${beats}`,
    input.productName ? `product=${input.productName}` : "",
    input.durationSec ? `duration=${input.durationSec}s` : "",
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
