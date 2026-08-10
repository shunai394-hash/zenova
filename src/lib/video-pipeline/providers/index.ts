/**
 * VideoProvider レジストリ
 *
 * 環境変数:
 *   VIDEO_PROVIDER=mock|kling|seedance|runway|sora|luma
 *
 * 互換:
 *   VIDEO_PIPELINE_PROVIDER（旧）も参照。VIDEO_PROVIDER 優先。
 */

import type { PipelineVideoProviderId } from "../types";
import { KlingPipelineProvider } from "./kling-provider";
import { MockVideoProvider } from "./mock-provider";
import { StubVideoProvider } from "./stub-provider";
import type { VideoProvider, VideoProviderId } from "./types";

export type {
  VideoProvider,
  VideoProviderId,
  GenerateVideoParams,
  GenerateVideoOutcome,
  ProviderJobStatus,
  PipelineVideoProvider,
} from "./types";

const ALLOWED: VideoProviderId[] = [
  "mock",
  "kling",
  "luma",
  "seedance",
  "runway",
  "sora",
];

/**
 * 1. 明示指定
 * 2. VIDEO_PROVIDER
 * 3. VIDEO_PIPELINE_PROVIDER（互換）
 * 4. mock
 */
export function resolveVideoProviderId(
  explicit?: string | null
): VideoProviderId {
  const raw = (
    explicit ||
    process.env.VIDEO_PROVIDER ||
    process.env.VIDEO_PIPELINE_PROVIDER ||
    "mock"
  )
    .trim()
    .toLowerCase();

  // video-generation の auto はパイプライン層では mock 扱い（明示接続まで）
  if (raw === "auto") return "mock";

  if (ALLOWED.includes(raw as VideoProviderId)) {
    return raw as VideoProviderId;
  }
  return "mock";
}

/** @deprecated 互換 */
export function resolvePipelineProviderId(
  explicit?: string | null
): PipelineVideoProviderId {
  return resolveVideoProviderId(explicit);
}

export function getVideoProvider(providerId?: string | null): VideoProvider {
  const id = resolveVideoProviderId(providerId);

  switch (id) {
    case "mock":
      return new MockVideoProvider();
    case "kling":
      return new KlingPipelineProvider();
    case "seedance":
    case "runway":
    case "sora":
    case "luma":
      return new StubVideoProvider(id);
    default:
      return new MockVideoProvider();
  }
}

/** @deprecated 互換 */
export function getPipelineVideoProvider(
  providerId?: string | null
): VideoProvider {
  return getVideoProvider(providerId);
}
