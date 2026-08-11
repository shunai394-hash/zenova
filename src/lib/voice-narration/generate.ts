import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  getElevenLabsApiKey,
  synthesizeSpeechMp3,
} from "./elevenlabs";
import { generateNarrationScript } from "./script";
import type { NarrationResult, NarrationSceneInput } from "./types";
import { validateNarrationScript } from "@/lib/product-analysis/validate-video-claims";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseNarrationInputFromBody(
  body: Record<string, unknown>
): NarrationSceneInput | null {
  const optimized =
    body.optimized && typeof body.optimized === "object"
      ? (body.optimized as Record<string, unknown>)
      : body;

  const input: NarrationSceneInput = {
    optimized_hook: asString(
      optimized.optimized_hook ?? body.optimized_hook ?? body.hook
    ),
    optimized_scene_1: asString(
      optimized.optimized_scene_1 ?? body.optimized_scene_1 ?? body.scene_1
    ),
    optimized_scene_2: asString(
      optimized.optimized_scene_2 ?? body.optimized_scene_2 ?? body.scene_2
    ),
    optimized_scene_3: asString(
      optimized.optimized_scene_3 ?? body.optimized_scene_3 ?? body.scene_3
    ),
    optimized_cta: asString(
      optimized.optimized_cta ?? body.optimized_cta ?? body.cta
    ),
    product_name: asString(body.product_name) || undefined,
    generate_audio:
      body.generate_audio === undefined
        ? true
        : Boolean(body.generate_audio),
  };

  if (
    !input.optimized_hook ||
    !input.optimized_scene_1 ||
    !input.optimized_scene_2 ||
    !input.optimized_scene_3 ||
    !input.optimized_cta
  ) {
    return null;
  }

  return input;
}

/**
 * 台本生成 → ElevenLabs → public/generated/audio に mp3 保存
 * 音声失敗時も script は返し、audio_url は null（パイプライン継続用）
 */
export async function generateSalesNarration(
  input: NarrationSceneInput
): Promise<NarrationResult> {
  const claimCtx = {
    productName: asString(input.product_name) || "商品",
    analysis: input.productAnalysis || null,
    buckets: {
      confirmed: input.confirmed || [],
      inferred: [] as string[],
      unknown: [] as string[],
      excluded: input.excluded || [],
      notSupported: input.excluded || [],
    },
  };
  const override = input.script_override?.trim();
  const script = override
    ? validateNarrationScript(override, claimCtx)
    : await generateNarrationScript(input);

  if (input.generate_audio === false) {
    return {
      script,
      audio_url: null,
      voice_provider: null,
      voice_id: null,
      filename: null,
      bytes: null,
      skipped: true,
      skip_reason: "generate_audio=false",
    };
  }

  if (!getElevenLabsApiKey()) {
    console.warn(
      "[voice-narration] ELEVENLABS_API_KEY missing; skip audio generation"
    );
    return {
      script,
      audio_url: null,
      voice_provider: null,
      voice_id: null,
      filename: null,
      bytes: null,
      skipped: true,
      skip_reason: "ELEVENLABS_API_KEY missing",
    };
  }

  try {
    const { audioBytes, voiceId } = await synthesizeSpeechMp3({
      text: script,
      voiceId: input.voice_id,
    });
    const dir = path.join(process.cwd(), "public", "generated", "audio");
    await mkdir(dir, { recursive: true });
    const filename = `zenova-narration-${Date.now()}-${randomUUID().slice(0, 8)}.mp3`;
    await writeFile(path.join(dir, filename), audioBytes);
    const audioUrl = `/generated/audio/${filename}`;

    console.log(
      `[voice-narration] saved audio_url=${audioUrl} bytes=${audioBytes.length} ` +
        `voice_provider=elevenlabs voice_id=${voiceId}`
    );

    return {
      script,
      audio_url: audioUrl,
      voice_provider: "elevenlabs",
      voice_id: voiceId,
      filename,
      bytes: audioBytes.length,
      skipped: false,
      skip_reason: null,
    };
  } catch (error) {
    console.error("[voice-narration] audio generation failed (non-fatal):", error);
    return {
      script,
      audio_url: null,
      voice_provider: null,
      voice_id: null,
      filename: null,
      bytes: null,
      skipped: true,
      skip_reason: error instanceof Error ? error.message : String(error),
    };
  }
}
