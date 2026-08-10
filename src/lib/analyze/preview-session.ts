/**
 * 生成後プレビュー画面へ渡すデータのセッション保存。
 */

import type { VideoPlan, VideoResult, VideoIdea } from "@/lib/video-pipeline";
import type { MarketingCheckReport } from "@/lib/ai-marketing-engine";

export const VIDEO_PREVIEW_STORAGE_KEY = "zenova_video_preview_v1";

export type VideoPreviewPayload = {
  videoUrl: string;
  videoId?: string | null;
  productId?: string | null;
  /** 画面上の動画タイトル */
  title?: string | null;
  productName?: string | null;
  /** 商品説明（チェックリスト用） */
  productDescription?: string | null;
  score?: number | null;
  hook?: string | null;
  cta?: string | null;
  sellingAngle?: string | null;
  /** 使用スタイル（UGC など） */
  style?: string | null;
  /** AI構成テキスト */
  structure?: string | null;
  /** スピーカー表示用 */
  speaker?: string | null;
  captionsEnabled?: boolean | null;
  durationSec?: number | null;
  /** 縦型想定（未指定時は true） */
  isVertical?: boolean | null;
  createdAt: string;
  /** VideoResult.thumbnail */
  thumbnail?: string | null;
  /** VideoResult.caption */
  caption?: string | null;
  /** 企画データ（analyze と同じ型） */
  videoPlan?: VideoPlan | null;
  /** 生成結果オブジェクト */
  videoResult?: VideoResult | null;
  /** 選択した AI 動画企画 */
  videoIdea?: VideoIdea | null;
  /** 投稿前AIマーケティング診断結果 */
  marketingCheck?: MarketingCheckReport | null;
  /** 診断済みフラグ（UI: AIチェック完了） */
  marketingChecked?: boolean | null;
};

export function saveVideoPreviewPayload(payload: VideoPreviewPayload): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      VIDEO_PREVIEW_STORAGE_KEY,
      JSON.stringify(payload)
    );
  } catch {
    // ignore quota / private mode
  }
}

export function loadVideoPreviewPayload(): VideoPreviewPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(VIDEO_PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VideoPreviewPayload;
    if (!parsed?.videoUrl) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearVideoPreviewPayload(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(VIDEO_PREVIEW_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function buildPreviewHref(payload: VideoPreviewPayload): string {
  const params = new URLSearchParams();
  params.set("url", payload.videoUrl);
  if (payload.videoId) params.set("id", payload.videoId);
  if (payload.productId) params.set("product", payload.productId);
  if (payload.title) params.set("title", payload.title);
  else if (payload.productName) params.set("name", payload.productName);
  if (payload.score != null) params.set("score", String(payload.score));
  if (payload.style) params.set("style", payload.style);
  return `/preview?${params.toString()}`;
}

/** Analyze の再生成導線 */
export function buildRegenerateHref(payload: VideoPreviewPayload): string {
  if (payload.productId) {
    return `/analyze?id=${encodeURIComponent(payload.productId)}`;
  }
  return "/analyze#generate-video";
}

/** Analyze の編集導線（企画書へ） */
export function buildEditHref(payload: VideoPreviewPayload): string {
  if (payload.productId) {
    return `/analyze?id=${encodeURIComponent(payload.productId)}#analysis-result`;
  }
  return "/analyze#analysis-result";
}

export type ImproveKind = "hook" | "cta" | "tiktok";

/** 改善フォーカス付きで Analyze 編集へ */
export function buildImproveEditHref(
  payload: VideoPreviewPayload,
  kind: ImproveKind
): string {
  const base = buildEditHref(payload);
  const hashIndex = base.indexOf("#");
  const path = hashIndex >= 0 ? base.slice(0, hashIndex) : base;
  const hash = hashIndex >= 0 ? base.slice(hashIndex) : "";
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}improve=${encodeURIComponent(kind)}${hash}`;
}