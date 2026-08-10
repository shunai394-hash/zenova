/**
 * TOP「生成できる動画サンプル」体験型ギャラリー用データ。
 *
 * 差し替えポイント:
 * - thumbnail / videoUrl を実アセットに変更
 * - 将来は generated_videos の人気動画を mapSampleFromGeneratedVideo() で流し込む
 * - /analyze?template=<templateKey> で Analyze の動画スタイルを自動選択
 */

import type { VideoStyleId } from "@/lib/analyze/video-settings";
import { normalizeVideoStyleId } from "@/lib/analyze/video-settings";

export const SAMPLE_SECTION_TITLE = "生成できる動画サンプル";
export const SAMPLE_SECTION_SUBTITLE =
  "商品ごとに最適なTikTok動画をAIが提案・生成します";

export type SampleVideoSource = "dummy" | "generated_videos";

export type SampleVideoItem = {
  id: string;
  templateKey: VideoStyleId;
  template: string;
  category: string;
  duration: string;
  durationSec: number;
  thumbnail: string | null;
  videoUrl: string | null;
  recommended: boolean;
  recommendedReason: string;
  recommendedHook: string;
  recommendedCta: string;
  source: SampleVideoSource;
};

const TEMPLATE_ALIASES: Record<string, VideoStyleId> = {
  ugc: "ugc",
  product_review: "product_review",
  ad: "ad",
  compare: "compare",
  ranking: "ranking",
  before_after: "before_after",
  "before-after": "before_after",
  beforeafter: "before_after",
  // legacy
  unbox: "product_review",
  benefit: "product_review",
  // 日本語
  ugcレビュー: "ugc",
  商品レビュー: "product_review",
  広告: "ad",
  広告風: "ad",
  比較: "compare",
  比較動画: "compare",
  ランキング: "ranking",
  "before / after": "before_after",
  "before/after": "before_after",
  ベネフィット: "product_review",
};

/** /analyze?template= の値を VideoStyleId に解決 */
export function resolveSampleTemplateKey(
  raw: string | null | undefined
): VideoStyleId | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toLowerCase();
  return TEMPLATE_ALIASES[key] ?? normalizeVideoStyleId(key);
}

export function buildAnalyzeTemplateHref(templateKey: VideoStyleId): string {
  return `/analyze?template=${encodeURIComponent(templateKey)}`;
}

const TEMPLATE_LABELS: Record<VideoStyleId, string> = {
  product_review: "商品レビュー",
  ugc: "UGC",
  ad: "広告風",
  before_after: "Before After",
  compare: "比較",
  ranking: "ランキング",
};

/**
 * FUTURE: generated_videos 行 → サンプルカードへの変換口。
 * 人気順クエリ結果をここに渡して SAMPLE_VIDEOS 相当を組み立てる。
 */
export function mapSampleFromGeneratedVideo(row: {
  id: string;
  product_name?: string | null;
  style?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  duration_sec?: number | null;
  recommended_reason?: string | null;
  recommended_hook?: string | null;
  recommended_cta?: string | null;
  hook?: string | null;
  script?: string | null;
}): SampleVideoItem {
  const durationSec =
    typeof row.duration_sec === "number" && row.duration_sec > 0
      ? row.duration_sec
      : 15;
  const templateKey =
    resolveSampleTemplateKey(row.style) ?? ("ugc" as VideoStyleId);

  return {
    id: row.id,
    templateKey,
    template: TEMPLATE_LABELS[templateKey] || row.style?.trim() || "生成動画",
    category: row.product_name?.trim() || "商品",
    duration: `${durationSec}秒`,
    durationSec,
    thumbnail: row.thumbnail_url?.trim() || null,
    videoUrl: row.video_url?.trim() || null,
    recommended: true,
    recommendedReason:
      row.recommended_reason?.trim() ||
      "人気の生成動画パターンです。同じテンプレートで自社商品の動画を作れます。",
    recommendedHook:
      row.recommended_hook?.trim() ||
      row.hook?.trim() ||
      "冒頭3秒で興味を引く一言を入れてください",
    recommendedCta:
      row.recommended_cta?.trim() ||
      "プロフィールのリンクからチェック",
    source: "generated_videos",
  };
}

/** 現在はダミー。後から generated_videos 人気動画へ差し替え可 */
export const SAMPLE_VIDEOS: SampleVideoItem[] = [
  {
    id: "sample-ugc-serum",
    templateKey: "ugc",
    template: "UGCレビュー",
    category: "美容液",
    duration: "15秒",
    durationSec: 15,
    thumbnail: null,
    videoUrl: null,
    recommended: true,
    recommendedReason:
      "美容液は「リアルな使用感」が信頼につながりやすいため、UGC口コミ形式が最も反応しやすいです。",
    recommendedHook: "正直に言うと…この美容液、期待以上でした",
    recommendedCta: "気になる人はプロフィールのリンクからチェック",
    source: "dummy",
  },
  {
    id: "sample-compare-earbuds",
    templateKey: "compare",
    template: "比較動画",
    category: "ワイヤレスイヤホン",
    duration: "30秒",
    durationSec: 30,
    thumbnail: null,
    videoUrl: null,
    recommended: false,
    recommendedReason:
      "スペック差が分かりやすいガジェットは、比較構成で「選び方」を示すと購買決断が速くなります。",
    recommendedHook: "同じ価格帯なら、どっちを買うべき？",
    recommendedCta: "詳細スペックはプロフィールから確認してね",
    source: "dummy",
  },
  {
    id: "sample-before-after-cleaning",
    templateKey: "before_after",
    template: "Before / After",
    category: "掃除グッズ",
    duration: "15秒",
    durationSec: 15,
    thumbnail: null,
    videoUrl: null,
    recommended: true,
    recommendedReason:
      "変化が一目で分かる商品は Before/After が最強。スクロールを止める視覚インパクトが出ます。",
    recommendedHook: "これ、掃除前と後で別人レベル…",
    recommendedCta: "今すぐ試したい人はリンクからどうぞ",
    source: "dummy",
  },
  {
    id: "sample-ranking-gadgets",
    templateKey: "ranking",
    template: "ランキング",
    category: "便利グッズ",
    duration: "30秒",
    durationSec: 30,
    thumbnail: null,
    videoUrl: null,
    recommended: false,
    recommendedReason:
      "便利グッズは「どれが一番か」が気になる層が多いため、ランキング形式で視聴維持と保存が伸びやすいです。",
    recommendedHook: "2026年、これ買わないと損する便利グッズTOP3",
    recommendedCta: "全商品リンクはプロフィールにまとめてます",
    source: "dummy",
  },
  {
    id: "sample-unbox-kitchen",
    templateKey: "product_review",
    template: "商品レビュー",
    category: "キッチン用品",
    duration: "20秒",
    durationSec: 20,
    thumbnail: null,
    videoUrl: null,
    recommended: false,
    recommendedReason:
      "開封〜使用感のレビューは「所有欲」を刺激しやすい。キッチン用品は手触り・質感の見せ場が多い型です。",
    recommendedHook: "届いた瞬間テンション上がった…開封していきます",
    recommendedCta: "同じ商品はプロフィールのリンクから",
    source: "dummy",
  },
  {
    id: "sample-benefit-insole",
    templateKey: "ad",
    template: "広告風",
    category: "インソール",
    duration: "15秒",
    durationSec: 15,
    thumbnail: null,
    videoUrl: null,
    recommended: true,
    recommendedReason:
      "体感メリットが主軸の商品は、きれいに見せる広告風＋明確なCTAが刺さりやすいです。",
    recommendedHook: "立ち仕事の足の疲れ、これ1枚で変わりました",
    recommendedCta: "まずは公式リンクでサイズをチェック",
    source: "dummy",
  },
];
