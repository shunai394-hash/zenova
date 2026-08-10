import { NextRequest, NextResponse } from "next/server";
import { composeSalesVideo } from "@/lib/video-composer";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * POST /api/video-composer
 *
 * Kling 動画 + ElevenLabs 音声 + 任意字幕焼き込み。
 * 音声・字幕なしの場合は元動画を final_video_url として返す。
 */
export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = await req.json();
    const result = await composeSalesVideo({
      video_url: String(body.video_url ?? ""),
      audio_url: body.audio_url ?? null,
      narration_script: body.narration_script ?? null,
      subtitle_file: body.subtitle_file ?? null,
      burn_captions: body.burn_captions,
      watermark_required: body.watermark_required,
    });

    console.log(
      `[video-composer] ok audio_merged=${result.audio_merged} ` +
        `captions_burned=${result.captions_burned} ` +
        `watermark_applied=${result.watermark_applied} ` +
        `elapsed_ms=${Date.now() - startedAt}`
    );

    return NextResponse.json({
      final_video_url: result.final_video_url,
      audio_merged: result.audio_merged,
      captions_burned: result.captions_burned,
      watermark_applied: result.watermark_applied,
      subtitle_file: result.subtitle_file,
      filename: result.filename,
      bytes: result.bytes,
      video_url: result.video_url,
      audio_url: result.audio_url,
      narration_script: result.narration_script,
      skipped: result.skipped,
      skip_reason: result.skip_reason,
      elapsed_ms: Date.now() - startedAt,
    });
  } catch (error) {
    console.error(
      `[video-composer] error elapsed_ms=${Date.now() - startedAt}`,
      error
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        final_video_url: null,
        audio_merged: false,
        captions_burned: false,
        watermark_applied: false,
      },
      { status: 500 }
    );
  }
}
