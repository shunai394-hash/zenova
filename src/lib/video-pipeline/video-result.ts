import type { VideoResult } from "./types";
import type { VideoPreviewPayload } from "@/lib/analyze/preview-session";
import type { VideoPlan } from "./types";
import { videoPlanToStructureText } from "./video-plan";

/**
 * API 応答から VideoResult を構築
 */
export function buildVideoResult(input: {
  videoUrl: string;
  thumbnail?: string | null;
  duration: number;
  score?: number | null;
  caption?: string | null;
  hook?: string | null;
  cta?: string | null;
  videoId?: string | null;
  productId?: string | null;
  provider?: string | null;
}): VideoResult {
  const caption =
    input.caption?.trim() ||
    [input.hook, input.cta].filter(Boolean).join("\n") ||
    "";

  return {
    videoUrl: input.videoUrl,
    thumbnail: input.thumbnail ?? null,
    duration: input.duration,
    score: typeof input.score === "number" ? input.score : 0,
    caption,
    videoId: input.videoId ?? null,
    productId: input.productId ?? null,
    provider: input.provider ?? null,
  };
}

/** VideoResult + VideoPlan → preview session 用 */
export function videoResultToPreviewPayload(input: {
  result: VideoResult;
  plan?: VideoPlan | null;
  idea?: import("./types").VideoIdea | null;
  productName?: string | null;
  productDescription?: string | null;
  style?: string | null;
  speaker?: string | null;
  captionsEnabled?: boolean | null;
  sellingAngle?: string | null;
}): VideoPreviewPayload {
  const { result, plan, idea } = input;
  return {
    videoUrl: result.videoUrl,
    videoId: result.videoId,
    productId: result.productId,
    title: plan?.title || idea?.title || input.productName || "生成動画",
    productName: input.productName || plan?.title || null,
    productDescription: input.productDescription ?? null,
    score: result.score,
    hook: result.caption.split("\n")[0] || idea?.hook || null,
    cta:
      result.caption.split("\n").slice(1).join("\n") || idea?.cta || null,
    sellingAngle: input.sellingAngle ?? null,
    style: input.style || plan?.style || idea?.videoStyle || null,
    structure: plan ? videoPlanToStructureText(plan) : null,
    speaker: input.speaker ?? null,
    captionsEnabled: input.captionsEnabled ?? true,
    durationSec: result.duration || plan?.duration || null,
    isVertical: true,
    createdAt: new Date().toISOString(),
    thumbnail: result.thumbnail,
    caption: result.caption,
    videoPlan: plan ?? null,
    videoResult: result,
    videoIdea: idea ?? null,
  };
}

/** ダミー結果（UIフロー検証用） */
export function createDummyVideoResult(
  overrides?: Partial<VideoResult>
): VideoResult {
  return {
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: null,
    duration: 15,
    score: 82,
    caption:
      "知らないと損。これ、最初の3秒だけ見て\n気になった人はプロフィールのリンクからチェック",
    videoId: "dummy-video",
    productId: null,
    provider: "mock",
    ...overrides,
  };
}
