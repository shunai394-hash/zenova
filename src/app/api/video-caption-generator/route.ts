import { NextRequest, NextResponse } from "next/server";
import { generateVideoCaptions } from "@/lib/video-caption";

export const runtime = "nodejs";

/**
 * POST /api/video-caption-generator
 *
 * ナレーション台本から TikTok 向け字幕タイミング + ASS/SRT を生成する。
 */
export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = await req.json();
    const result = await generateVideoCaptions({
      narration_script: String(body.narration_script ?? ""),
      duration: Number(body.duration) || 15,
      scenes: Array.isArray(body.scenes) ? body.scenes : null,
    });

    console.log(
      `[video-caption-generator] ok cues=${result.captions.length} ` +
        `elapsed_ms=${Date.now() - startedAt}`
    );

    return NextResponse.json({
      captions: result.captions,
      subtitle_file: result.subtitle_file,
      format: result.format,
      duration_sec: result.duration_sec,
      elapsed_ms: Date.now() - startedAt,
    });
  } catch (error) {
    console.error(
      `[video-caption-generator] error elapsed_ms=${Date.now() - startedAt}`,
      error
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        captions: [],
        subtitle_file: null,
      },
      { status: 400 }
    );
  }
}
