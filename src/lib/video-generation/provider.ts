import { KlingVideoProvider } from "./kling";
import { LumaVideoProvider } from "./luma";
import { MockVideoProvider } from "./mock";
import type {
  GenerateVideoInput,
  GenerateVideoResult,
  VideoGenerationProvider,
  VideoProviderId,
} from "./types";

export type { GenerateVideoInput, GenerateVideoResult, VideoProviderId };

function hasKlingCredentials(): boolean {
  if (process.env.KLING_API_KEY?.trim()) return true;
  return Boolean(
    process.env.KLING_ACCESS_KEY?.trim() &&
      process.env.KLING_SECRET_KEY?.trim()
  );
}

function hasLumaCredentials(): boolean {
  return Boolean(process.env.LUMA_API_KEY?.trim());
}

/**
 * 優先順位:
 * 1. 明示指定 (body.provider / VIDEO_PROVIDER)
 * 2. auto: kling → luma → mock
 */
export function resolveProviderId(explicit?: string | null): VideoProviderId {
  const raw = (explicit || process.env.VIDEO_PROVIDER || "auto")
    .trim()
    .toLowerCase();

  if (raw === "kling" || raw === "luma" || raw === "mock") {
    return raw;
  }

  // auto
  if (hasKlingCredentials()) return "kling";
  if (hasLumaCredentials()) return "luma";
  return "mock";
}

export function getVideoProvider(
  providerId?: string | null
): VideoGenerationProvider {
  const id = resolveProviderId(providerId);

  switch (id) {
    case "kling":
      return new KlingVideoProvider();
    case "luma":
      return new LumaVideoProvider();
    case "mock":
    default:
      return new MockVideoProvider();
  }
}

/**
 * mock フォールバック可否。
 * Kling / Luma 実API経路ではフォールバックしない。
 */
export function allowMockFallback(requestedId: VideoProviderId): boolean {
  if (requestedId === "mock") return false;
  if (requestedId === "kling" || requestedId === "luma") return false;

  const flag = (process.env.VIDEO_ALLOW_MOCK_FALLBACK || "")
    .trim()
    .toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no" || flag === "off") {
    return false;
  }

  const envProvider = (process.env.VIDEO_PROVIDER || "").trim().toLowerCase();
  if (envProvider === "kling" || envProvider === "luma") {
    return false;
  }

  return true;
}

export function buildMotionPrompt(
  motion: string,
  productHint?: string
): string {
  const base =
    motion.trim() || "gentle camera push-in, natural product showcase";
  const product = productHint?.trim();

  return [
    product ? `Product: ${product}.` : "",
    `Motion: ${base}.`,
    "Vertical 9:16 TikTok-style commercial clip, about 15 seconds,",
    "smooth cinematic motion, realistic lighting, no text overlay, no watermark.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * route から呼ぶ統一エントリ。
 * VIDEO_PROVIDER=kling|luma 固定、または VIDEO_ALLOW_MOCK_FALLBACK=false のときは
 * 失敗しても mock に落とさずエラーを返す。
 */
export async function generateAiVideo(input: {
  imageBase64: string;
  motion: string;
  productName?: string;
  durationSec: number;
  provider?: string | null;
  /** sales_scenario.kling_prompt など。指定時は motion 組み立てを使わない */
  promptOverride?: string | null;
}): Promise<
  GenerateVideoResult & {
    prompt: string;
    fallback_from?: VideoProviderId | null;
    fallback_error?: string | null;
  }
> {
  const override = input.promptOverride?.trim();
  const prompt = override
    ? override.slice(0, 2500)
    : buildMotionPrompt(input.motion, input.productName);
  const requestedId = resolveProviderId(input.provider);
  const payload: GenerateVideoInput = {
    imageBase64: input.imageBase64,
    motion: input.motion,
    prompt,
    productName: input.productName,
    durationSec: input.durationSec,
  };

  const primary = getVideoProvider(requestedId);

  try {
    const result = await primary.generate(payload);
    return {
      ...result,
      prompt,
      fallback_from: null,
      fallback_error: null,
    };
  } catch (error) {
    // 既に mock 指定、またはフォールバック無効ならそのまま失敗させる
    if (
      requestedId === "mock" ||
      primary.id === "mock" ||
      !allowMockFallback(requestedId)
    ) {
      console.error(
        `[create-ai-video] real API failed (no mock fallback) ` +
          `provider=${primary.id} VIDEO_PROVIDER=${
            process.env.VIDEO_PROVIDER ?? "(unset)"
          } VIDEO_ALLOW_MOCK_FALLBACK=${
            process.env.VIDEO_ALLOW_MOCK_FALLBACK ?? "(unset)"
          }`,
        error
      );
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[create-ai-video] mock_fallback triggered from_provider=${primary.id} ` +
        `reason=${message}`
    );
    console.error(
      `[video-provider:${primary.id}] FALLBACK_TO_MOCK detail=`,
      error
    );

    const mock = new MockVideoProvider();
    const result = await mock.generate(payload);

    return {
      ...result,
      prompt,
      fallback_from: primary.id,
      fallback_error: message,
      meta: {
        ...(result.meta ?? {}),
        fallback: true,
        fallback_from: primary.id,
        fallback_error: message,
      },
    };
  }
}
