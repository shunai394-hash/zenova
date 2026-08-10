/**
 * Analyze「動画タイプ / 動画設定」定数
 * 初心者向け説明付き。差し替えやすいよう ID / label を分離。
 */

export const VIDEO_STYLE_OPTIONS = [
  {
    id: "product_review",
    label: "商品レビュー",
    icon: "📦",
    description:
      "使ってみた感想を伝える型。初めての人でも作りやすく、信頼感が出やすいです。",
    beginnerTip: "「正直レビュー」から始めると止まりやすい",
    suitableProducts: "ガジェット・日用品・キッチン",
    motion:
      "product review TikTok, creator showing product details and usage, clear close-ups, natural lighting, vertical 9:16",
  },
  {
    id: "ugc",
    label: "UGCレビュー",
    icon: "💄",
    description:
      "実際に使った感想風。友達に勧める口コミトーンで反応が取りやすい型です。",
    beginnerTip: "カメラ目線の一言フックが重要",
    suitableProducts: "美容・健康・コスメ",
    motion:
      "authentic handheld UGC TikTok style, natural lighting, creator talking to camera with product",
  },
  {
    id: "ad",
    label: "広告風",
    icon: "✨",
    description:
      "ブランド感のある見せ方。商品の魅力をきれいに見せて、最後に行動を促します。",
    beginnerTip: "最初の1秒で商品を大きく見せる",
    suitableProducts: "ブランド品・アパレル・美容機器",
    motion:
      "polished commercial TikTok ad style, cinematic product hero shots, clean lighting, smooth camera, vertical 9:16",
  },
  {
    id: "before_after",
    label: "Before After",
    icon: "🔄",
    description:
      "変化を並べて見せる型。掃除・美容・時短などビフォーアフターが分かる商品向け。",
    beginnerTip: "同じアングルでBeforeとAfterを対比",
    suitableProducts: "掃除・美容・時短グッズ",
    motion:
      "before-to-after transformation feeling, product usage in daily life, clear contrast",
  },
  {
    id: "compare",
    label: "比較",
    icon: "⚖️",
    description:
      "どっちを買うべきかを短く整理する型。迷っている人の決断を後押しします。",
    beginnerTip: "比較軸は2つまでに絞る",
    suitableProducts: "ガジェット・家電・競合が多い商品",
    motion:
      "side-by-side product comparison pacing, clear before choice feeling, energetic TikTok edit",
  },
  {
    id: "ranking",
    label: "ランキング",
    icon: "🏆",
    description:
      "TOP○形式でテンポよく見せる型。保存されやすく、シリーズ化にも向いています。",
    beginnerTip: "下位から見せて1位で締める",
    suitableProducts: "便利グッズ・まとめ買い・季節商品",
    motion:
      "ranking countdown energy, bold product showcase cuts, dynamic TikTok pacing",
  },
] as const;

export const VIDEO_DURATION_OPTIONS = [
  { id: 15, label: "15秒" },
  { id: 30, label: "30秒" },
  { id: 45, label: "45秒" },
  { id: 60, label: "60秒" },
] as const;

export const VIDEO_SPEAKER_OPTIONS = [
  { id: "female", label: "女性" },
  { id: "male", label: "男性" },
  { id: "ai", label: "AIナレーション" },
] as const;

export const VIDEO_BGM_OPTIONS = [
  { id: "trend", label: "トレンド" },
  { id: "pop", label: "ポップ" },
  { id: "cinematic", label: "シネマティック" },
  { id: "none", label: "なし" },
] as const;

export type VideoStyleId = (typeof VIDEO_STYLE_OPTIONS)[number]["id"];
export type VideoSpeakerId = (typeof VIDEO_SPEAKER_OPTIONS)[number]["id"];
export type VideoBgmId = (typeof VIDEO_BGM_OPTIONS)[number]["id"];
export type VideoDurationSec = (typeof VIDEO_DURATION_OPTIONS)[number]["id"];

/** 動画タイプ = video_style（APIでは video_type としても送る） */
export type VideoTypeId = VideoStyleId;

export type VideoSettings = {
  video_style: VideoStyleId;
  duration_sec: VideoDurationSec;
  speaker: VideoSpeakerId;
  captions_enabled: boolean;
  bgm: VideoBgmId;
};

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  video_style: "ugc",
  duration_sec: 15,
  speaker: "female",
  captions_enabled: true,
  bgm: "trend",
};

/** 旧ID → 新ID（互換） */
const LEGACY_STYLE_MAP: Record<string, VideoStyleId> = {
  unbox: "product_review",
  benefit: "product_review",
  product_review: "product_review",
  ugc: "ugc",
  ad: "ad",
  before_after: "before_after",
  "before-after": "before_after",
  compare: "compare",
  ranking: "ranking",
};

export function normalizeVideoStyleId(
  raw: string | null | undefined
): VideoStyleId | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toLowerCase();
  if (LEGACY_STYLE_MAP[key]) return LEGACY_STYLE_MAP[key];
  const found = VIDEO_STYLE_OPTIONS.find((o) => o.id === key);
  return found?.id ?? null;
}

export function getVideoStyleOption(id: string) {
  const normalized = normalizeVideoStyleId(id) ?? "ugc";
  return (
    VIDEO_STYLE_OPTIONS.find((o) => o.id === normalized) ??
    VIDEO_STYLE_OPTIONS[1]
  );
}

export function getVideoStyleLabel(id: string): string {
  return getVideoStyleOption(id).label;
}

export function getVideoStyleDescription(id: string): string {
  return getVideoStyleOption(id).description;
}

export function getVideoStyleMotion(id: string): string {
  return getVideoStyleOption(id).motion;
}

export function getSpeakerLabel(id: string): string {
  return VIDEO_SPEAKER_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function getBgmLabel(id: string): string {
  return VIDEO_BGM_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

/** ElevenLabs voice_id 解決（環境変数で差し替え可） */
export function resolveSpeakerVoiceId(
  speaker: VideoSpeakerId
): string | undefined {
  if (speaker === "female") {
    return (
      process.env.ELEVENLABS_VOICE_ID_FEMALE?.trim() ||
      process.env.ELEVENLABS_VOICE_ID?.trim() ||
      undefined
    );
  }
  if (speaker === "male") {
    return (
      process.env.ELEVENLABS_VOICE_ID_MALE?.trim() ||
      "pNInz6obpgDQGcFmaJgB"
    );
  }
  return (
    process.env.ELEVENLABS_VOICE_ID_AI?.trim() ||
    process.env.ELEVENLABS_VOICE_ID?.trim() ||
    undefined
  );
}
