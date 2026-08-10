import { NextRequest, NextResponse } from "next/server";
import {
  generateSalesNarration,
  parseNarrationInputFromBody,
} from "@/lib/voice-narration";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/generate-narration
 *
 * 販売シナリオ（optimized_*）から台本＋ElevenLabs音声を生成する。
 * 音声失敗時も script は返し、audio_url は null。
 */
export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const input = parseNarrationInputFromBody(body);

    if (!input) {
      return NextResponse.json(
        {
          error:
            "optimized_hook, optimized_scene_1, optimized_scene_2, optimized_scene_3, optimized_cta は必須です",
        },
        { status: 400 }
      );
    }

    const result = await generateSalesNarration(input);

    console.log(
      `[generate-narration] ok audio=${Boolean(result.audio_url)} ` +
        `skipped=${result.skipped} elapsed_ms=${Date.now() - startedAt}`
    );

    return NextResponse.json({
      script: result.script,
      audio_url: result.audio_url,
      voice_provider: result.voice_provider,
      voice_id: result.voice_id,
      filename: result.filename,
      bytes: result.bytes,
      skipped: result.skipped,
      skip_reason: result.skip_reason,
      elapsed_ms: Date.now() - startedAt,
    });
  } catch (error) {
    console.error(
      `[generate-narration] error elapsed_ms=${Date.now() - startedAt}`,
      error
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        audio_url: null,
        voice_provider: null,
      },
      { status: 500 }
    );
  }
}
