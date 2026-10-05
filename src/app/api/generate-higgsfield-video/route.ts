import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { checkVideoLimit, recordVideoGenerationAttempt } from "@/lib/usage";

export const runtime = "nodejs";

const HF_BASE = "https://api.higgsfield.ai";
const DEFAULT_MODEL = "bytedance/seedance-2.5/text-to-video";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
]);

const SUPPORTED_MODELS = new Set([
  "bytedance/seedance-2.5/text-to-video",
  "alibaba/wan-3.0-prime/image-to-video",
  "kling-video/v3.0/pro/image-to-video",
  "kling-video/v3.0-turbo/image-to-video",
  "minimax/h3/image-to-video",
]);

function modelDurationClamp(model: string, duration: number) {
  if (model === "bytedance/seedance-2.5/text-to-video") return Math.min(30, Math.max(4, duration));
  return Math.min(15, Math.max(3, duration));
}

function getCancelSecret(): string {
  const secret =
    process.env.HIGGSFIELD_CANCEL_SECRET?.trim() ||
    process.env.HIGGSFIELD_API_KEY?.trim() ||
    process.env.HF_API_KEY?.trim();
  if (!secret) throw new Error("HIGGSFIELD_CANCEL_SECRET が設定されていません");
  return secret;
}

function createCancelToken(userId: string, requestId: string): string {
  return createHmac("sha256", getCancelSecret())
    .update(`zenova:cancel:${userId}:${requestId}`)
    .digest("hex");
}

function getApiKey() {
  const key = process.env.HIGGSFIELD_API_KEY?.trim() || process.env.HF_API_KEY?.trim();
  if (!key) throw new Error("HIGGSFIELD_API_KEY が設定されていません");
  return key.replace(/^Key\s+/i, "");
}

async function hfFetch(path: string, init: RequestInit = {}) {
  const key = getApiKey();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Key ${key}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${HF_BASE}${path}`, { ...init, headers, cache: "no-store" });
}

async function uploadMedia(file: File) {
  const contentType = file.type;
  const create = await hfFetch("/files/generate-upload-url", {
    method: "POST",
    body: JSON.stringify({ content_type: contentType }),
  });
  if (!create.ok) throw new Error(`Higgsfield upload URL取得失敗 (HTTP ${create.status})`);

  const upload = await create.json() as {
    upload_url?: string;
    upload_headers?: Record<string, string>;
    public_url?: string;
  };
  if (!upload.upload_url || !upload.public_url) {
    throw new Error("Higgsfieldのメディアアップロード情報が不完全です");
  }

  const putHeaders = new Headers(upload.upload_headers || {});
  putHeaders.delete("Authorization");
  const put = await fetch(upload.upload_url, {
    method: "PUT",
    headers: putHeaders,
    body: await file.arrayBuffer(),
  });
  if (!put.ok) throw new Error(`Higgsfieldメディアアップロード失敗 (HTTP ${put.status})`);
  return upload.public_url;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const user = await requireAuthUser();
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です", login_url: "/login" }, { status: 401 });
    }

    const limit = await checkVideoLimit(user.id, { email: user.email });
    if (!limit.allowed) {
      return NextResponse.json({
        error: limit.reason || "動画生成の利用上限に達しています",
        plan: limit.plan,
        remaining: limit.remaining,
        used: limit.used,
        video_limit: limit.video_limit,
      }, { status: 402 });
    }

    recordVideoGenerationAttempt(user.id);

    const form = await req.formData();
    const image = form.get("image");
    const video = form.get("video");
    const audio = form.get("audio");
    const prompt = String(form.get("prompt") || "").trim();
    const model = String(form.get("model") || DEFAULT_MODEL);
    const requestedDuration = Number(form.get("duration") || 5);
    const aspectRatio = String(form.get("aspect_ratio") || "9:16");
    const sound = String(form.get("sound") || "on") === "on";
    const bgm = String(form.get("bgm") || "off") === "on";
    const narration = String(form.get("narration") || "off") === "on";
    const sfx = String(form.get("sfx") || "off") === "on";

    // Audio controls are meaningful only when generated audio is enabled.
    // Keep the server as the source of truth so a stale client cannot request
    // contradictory combinations such as sound=off + narration=on.
    const effectiveBgm = sound && bgm;
    const effectiveNarration = sound && narration;
    const effectiveSfx = sound && sfx;

    if (!SUPPORTED_MODELS.has(model)) {
      return NextResponse.json({ error: "model が不正です" }, { status: 400 });
    }
    if (!Number.isFinite(requestedDuration) || requestedDuration <= 0) {
      return NextResponse.json({ error: "duration は正の数で指定してください" }, { status: 400 });
    }
    if (!["9:16", "16:9", "1:1"].includes(aspectRatio)) {
      return NextResponse.json({ error: "aspect_ratio が不正です" }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ error: "動画の内容を自然文で入力してください" }, { status: 400 });
    }
    if (prompt.length > 5000) {
      return NextResponse.json({ error: "プロンプトは 5,000 文字以内で入力してください" }, { status: 400 });
    }

    if (image instanceof File) {
      if (!ALLOWED_IMAGE_TYPES.has(image.type)) return NextResponse.json({ error: "画像形式は JPG・PNG・WebP に対応しています" }, { status: 400 });
      if (image.size <= 0 || image.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "画像サイズは 10MB 以下にしてください" }, { status: 413 });
    }
    if (video instanceof File) {
      if (!ALLOWED_VIDEO_TYPES.has(video.type)) return NextResponse.json({ error: "動画形式は MP4・WebM・MOV に対応しています" }, { status: 400 });
      if (video.size <= 0 || video.size > MAX_VIDEO_BYTES) return NextResponse.json({ error: "動画サイズは 100MB 以下にしてください" }, { status: 413 });
    }
    if (audio instanceof File) {
      if (!ALLOWED_AUDIO_TYPES.has(audio.type)) return NextResponse.json({ error: "音声形式に対応していません" }, { status: 400 });
      if (audio.size <= 0 || audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: "音声サイズは 50MB 以下にしてください" }, { status: 413 });
    }

    if (video instanceof File && model !== "bytedance/seedance-2.5/text-to-video") {
      return NextResponse.json({
        error: "動画リファレンスは現在 Seedance 2.5 で処理します。モデルをSeedance 2.5にしてください。",
      }, { status: 400 });
    }

    if (
      !video &&
      model !== "bytedance/seedance-2.5/text-to-video" &&
      (!(image instanceof File) || !ALLOWED_IMAGE_TYPES.has(image.type))
    ) {
      return NextResponse.json({ error: "このモデルでは JPG・PNG・WebP の画像を1枚アップロードしてください" }, { status: 400 });
    }

    const duration = modelDurationClamp(model, requestedDuration);
    const audioDirections = [
      effectiveBgm ? "include background music" : "no background music",
      effectiveNarration ? "include spoken narration or voiceover" : "no spoken narration",
      effectiveSfx ? "include purposeful sound effects" : "no added sound effects",
    ].join(", ");
    const directedPrompt = `${prompt}\n\nAudio direction: ${audioDirections}.`;
    const imageUrl = image instanceof File ? await uploadMedia(image) : null;
    const videoUrl = video instanceof File ? await uploadMedia(video) : null;
    const audioUrl = audio instanceof File ? await uploadMedia(audio) : null;

    const seedance = model === "bytedance/seedance-2.5/text-to-video";

    let endpointModel = model;
    let input: Record<string, unknown>;

    if (seedance && videoUrl) {
      endpointModel = "bytedance/seedance-2.5/video-edit";
      input = {
        prompt: directedPrompt,
        video_url: videoUrl,
        duration,
        resolution: "720p",
        output_format: "mp4",
        generate_audio: sound,
        ...(imageUrl ? { image_urls: [imageUrl] } : {}),
        ...(audioUrl ? { audio_urls: [audioUrl] } : {}),
      };
    } else if (seedance && (imageUrl || audioUrl)) {
      endpointModel = "bytedance/seedance-2.5/reference-to-video";
      input = {
        prompt: directedPrompt,
        duration,
        resolution: "720p",
        aspect_ratio: aspectRatio,
        output_format: "mp4",
        generate_audio: sound,
        ...(imageUrl ? { image_urls: [imageUrl] } : {}),
        ...(audioUrl ? { audio_urls: [audioUrl] } : {}),
      };
    } else if (seedance) {
      endpointModel = "bytedance/seedance-2.5/text-to-video";
      input = {
        prompt: directedPrompt,
        duration,
        resolution: "720p",
        aspect_ratio: aspectRatio,
        output_format: "mp4",
        generate_audio: sound,
      };
    } else if (model === "alibaba/wan-3.0-prime/image-to-video") {
      input = {
        prompt: directedPrompt,
        duration,
        image_url: imageUrl,
        aspect_ratio: aspectRatio,
        generate_audio: sound,
        resolution: "1080p",
        enable_thinking: false,
      };
    } else if (model === "minimax/h3/image-to-video") {
      input = {
        prompt: directedPrompt,
        duration,
        image_url: imageUrl,
        aspect_ratio: aspectRatio,
        resolution: "2K",
        aigc_watermark: false,
        ...(audioUrl ? { audio_url: audioUrl } : {}),
      };
    } else if (model === "kling-video/v3.0/pro/image-to-video") {
      input = {
        prompt: directedPrompt,
        duration,
        image_url: imageUrl,
        sound: sound ? "on" : "off",
        multi_shots: false,
      };
    } else {
      input = {
        prompt: directedPrompt,
        duration,
        image_url: imageUrl,
        resolution: "720p",
      };
    }

    const submit = await hfFetch(`/${endpointModel}`, {
      method: "POST",
      body: JSON.stringify(input),
    });

    if (!submit.ok) {
      const detail = await submit.text();
      throw new Error(`Higgsfield生成開始失敗 (HTTP ${submit.status}): ${detail.slice(0, 500)}`);
    }

    const queued = await submit.json() as { request_id?: string };
    if (!queued.request_id) throw new Error("Higgsfieldのrequest_idが返りませんでした");

    return NextResponse.json({
      status: "queued",
      request_id: queued.request_id,
      cancel_token: createCancelToken(user.id, queued.request_id),
      model: endpointModel,
      duration_sec: duration,
      aspect_ratio: aspectRatio,
      sound,
      audio_direction: {
        master: sound,
        bgm: effectiveBgm,
        narration: effectiveNarration,
        sfx: effectiveSfx,
      },
      inputs: {
        image: Boolean(imageUrl),
        video: Boolean(videoUrl),
        audio: Boolean(audioUrl),
      },
      elapsed_ms: Date.now() - startedAt,
    }, { status: 202 });
  } catch (error) {
    console.error("[generate-higgsfield-video] failed", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      elapsed_ms: Date.now() - startedAt,
    }, { status: 500 });
  }
}
