import type { ProductAnalysis } from "@/lib/product-analysis";
import type {
  VideoBgmId,
  VideoDurationSec,
  VideoSettings,
  VideoSpeakerId,
  VideoStyleId,
} from "@/lib/analyze/video-settings";
import { DEFAULT_VIDEO_SETTINGS } from "@/lib/analyze/video-settings";

export type RecommendedVideoSettings = VideoSettings & {
  reasons: string[];
};

function pickStyle(analysis: ProductAnalysis): {
  style: VideoStyleId;
  reason: string;
} {
  const haystack = [
    analysis.salesAngle,
    analysis.offerStyle,
    analysis.summary,
    ...(analysis.recommendedVideoStructure ?? []),
    ...(analysis.sellingPoints ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (/before|after|ビフォー|アフター|変化|比較前/.test(haystack)) {
    return { style: "before_after", reason: "変化・対比の訴求が強いため" };
  }
  if (/広告|コマーシャル|ブランド|シネマ/.test(haystack)) {
    return { style: "ad", reason: "ブランド感・広告寄りの見せ方が合うため" };
  }
  if (/比較|vs|競合/.test(haystack)) {
    return { style: "compare", reason: "比較・差別化の切り口があるため" };
  }
  if (/ランキング|おすすめ順|トップ|人気/.test(haystack)) {
    return { style: "ranking", reason: "ランキング型の見せ方が刺さりやすいため" };
  }
  if (/レビュー|開封|unbox|パッケージ|使ってみた/.test(haystack)) {
    return {
      style: "product_review",
      reason: "商品レビュー型で信頼を作りやすいため",
    };
  }
  if (/ベネフィット|効果|時短|解決|悩み|ugc|口コミ/.test(haystack)) {
    return { style: "ugc", reason: "本音UGCが汎用的に強いため" };
  }
  return { style: "ugc", reason: "短尺UGCが汎用的に強いため" };
}

function pickDuration(
  analysis: ProductAnalysis,
  platform?: string
): { duration: VideoDurationSec; reason: string } {
  const structureLen = analysis.recommendedVideoStructure?.length ?? 0;
  const plat = (platform || "").toLowerCase();

  if (plat.includes("youtube")) {
    return { duration: 45, reason: "YouTube Shorts向けにやや長めを推奨" };
  }
  if (structureLen >= 5) {
    return { duration: 30, reason: "構成ビートが多いため30秒を推奨" };
  }
  if (analysis.salesScore?.total != null && analysis.salesScore.total >= 80) {
    return { duration: 15, reason: "訴求が明確なので短尺15秒でテンポ重視" };
  }
  return { duration: 15, reason: "TikTok初期は15秒が扱いやすいため" };
}

function pickSpeaker(analysis: ProductAnalysis): {
  speaker: VideoSpeakerId;
  reason: string;
} {
  const text = `${analysis.targetInsight} ${analysis.buyerPersona}`.toLowerCase();
  if (/男性|メンズ|彼氏|夫|パパ/.test(text)) {
    return { speaker: "male", reason: "ターゲット表現が男性寄りのため" };
  }
  if (/女性|レディース|ママ|美容|スキン/.test(text)) {
    return { speaker: "female", reason: "ターゲット表現が女性寄りのため" };
  }
  return { speaker: "female", reason: "短尺では女性ボイスの親和性が高いため" };
}

/**
 * AI分析結果から動画設定のおすすめを生成する。
 */
export function recommendVideoSettings(input: {
  analysis: ProductAnalysis;
  platform?: string;
}): RecommendedVideoSettings {
  const { analysis, platform } = input;
  const style = pickStyle(analysis);
  const duration = pickDuration(analysis, platform);
  const speaker = pickSpeaker(analysis);

  // 字幕は短尺販売で基本ON
  const captions_enabled = true;

  // BGMは未実装のため提案値は保持するが UI では開発中表示
  // FUTURE: BGM合成実装後はスタイル連動で trend/pop/cinematic を切替
  const bgm: VideoBgmId =
    style.style === "ad" || style.style === "before_after"
      ? "cinematic"
      : style.style === "ranking"
        ? "pop"
        : "trend";

  return {
    video_style: style.style,
    duration_sec: duration.duration,
    speaker: speaker.speaker,
    captions_enabled,
    bgm,
    reasons: [
      `スタイル: ${style.reason}`,
      `尺: ${duration.reason}`,
      `話者: ${speaker.reason}`,
      "字幕: 短尺販売ではONを推奨",
      "BGM: 開発中（提案値のみ）",
    ],
  };
}

export function toVideoSettings(
  recommended: RecommendedVideoSettings
): VideoSettings {
  return {
    video_style: recommended.video_style,
    duration_sec: recommended.duration_sec,
    speaker: recommended.speaker,
    captions_enabled: recommended.captions_enabled,
    bgm: recommended.bgm,
  };
}

export function getDefaultRecommendedFallback(): RecommendedVideoSettings {
  return {
    ...DEFAULT_VIDEO_SETTINGS,
    reasons: ["分析前のためデフォルト設定です"],
  };
}
