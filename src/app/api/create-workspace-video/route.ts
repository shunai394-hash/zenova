import { NextRequest, NextResponse } from "next/server";
import { runWorkspaceVideoPipeline } from "@/lib/video-workspace";
import { requireAuthUser } from "@/lib/auth/session";
import {
  checkVideoLimit,
  consumeVideoUsage,
  recordVideoGenerationAttempt,
} from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BYTES = 48 * 1024 * 1024;

async function readOptionalFile(
  form: FormData,
  key: string
): Promise<{ bytes: Buffer; filename: string } | null> {
  const value = form.get(key);
  if (!value || typeof value === "string") return null;
  const file = value as File;
  if (!file.size) return null;
  if (file.size > MAX_BYTES) {
    throw new Error(`${key} が大きすぎます（48MBまで）`);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  return { bytes, filename: file.name || key };
}

/**
 * POST /api/create-workspace-video
 *
 * 台本 + Qwen音声 + 素材 → 字幕 → 9:16 MP4
 * 権限は既存 checkVideoLimit（テスト枠 5本/日を含む）。
 * Voicebox API（/api/tts）とパイプライン本体は変更しない。
 */
export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const user = await requireAuthUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "ログインが必要です",
          login_url: "/login?next=/video",
        },
        { status: 401 }
      );
    }

    const limit = await checkVideoLimit(user.id, { email: user.email });
    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            limit.reason ??
            "動画生成の利用上限に達しています。プランのアップグレードが必要です。",
          plan: limit.plan,
          remaining: limit.remaining,
          video_limit: limit.video_limit,
          used: limit.used,
          upgrade_url: "/pricing",
          login_url: "/login?next=/video",
        },
        { status: 403 }
      );
    }

    recordVideoGenerationAttempt(user.id);

    const form = await req.formData();
    const script = String(form.get("script") ?? "");
    const captionsOn = String(form.get("captions_on") ?? "1") !== "0";
    const motion = String(form.get("motion") ?? "") || undefined;
    const ttsGenerationId = String(form.get("tts_generation_id") ?? "") || null;
    const audioDurationRaw = Number(form.get("audio_duration_sec"));
    const audioDurationSec =
      Number.isFinite(audioDurationRaw) && audioDurationRaw > 0
        ? audioDurationRaw
        : null;

    const audio = await readOptionalFile(form, "audio");
    const image = await readOptionalFile(form, "image");
    const video = await readOptionalFile(form, "video");

    const result = await runWorkspaceVideoPipeline({
      script,
      captionsOn,
      motion,
      ttsGenerationId,
      audioBytes: audio?.bytes ?? null,
      audioFilename: audio?.filename ?? null,
      imageBytes: image?.bytes ?? null,
      imageFilename: image?.filename ?? null,
      videoBytes: video?.bytes ?? null,
      videoFilename: video?.filename ?? null,
      audioDurationSec,
    });

    const consumed = await consumeVideoUsage(
      user.id,
      {
        source: "video_workspace",
        provider: result.provider,
        visual_source: result.visual_source,
      },
      { email: user.email }
    );
    if (!consumed.ok) {
      console.warn(
        "[create-workspace-video] usage consume failed:",
        consumed.error
      );
    }

    console.log(
      `[create-workspace-video] ok provider=${result.provider} ` +
        `visual=${result.visual_source} captions=${result.captions_burned} ` +
        `user_id=${user.id} elapsed_ms=${Date.now() - startedAt}`
    );

    return NextResponse.json({
      ...result,
      remaining: consumed.summary?.remaining ?? limit.remaining,
      elapsed_ms: Date.now() - startedAt,
    });
  } catch (error) {
    console.error(
      `[create-workspace-video] error elapsed_ms=${Date.now() - startedAt}`,
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        elapsed_ms: Date.now() - startedAt,
      },
      { status: 400 }
    );
  }
}
