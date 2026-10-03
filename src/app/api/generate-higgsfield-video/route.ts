import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { checkVideoLimit, consumeVideoUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 300;

const HF_BASE = "https://api.higgsfield.ai";
const DEFAULT_MODEL = "alibaba/wan-3.0-prime/image-to-video";
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

async function uploadImage(file: File) {
  const contentType = file.type || "image/jpeg";
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
  if (!upload.upload_url || !upload.public_url) throw new Error("Higgsfieldの画像アップロード情報が不完全です");

  const bytes = await file.arrayBuffer();
  const putHeaders = new Headers(upload.upload_headers || {});
  putHeaders.delete("Authorization");
  const put = await fetch(upload.upload_url, {
    method: "PUT",
    headers: putHeaders,
    body: bytes,
  });
  if (!put.ok) throw new Error(`Higgsfield画像アップロード失敗 (HTTP ${put.status})`);
  return upload.public_url;
}

async function waitForVideo(requestId: string) {
  const deadline = Date.now() + 280_000;
  while (Date.now() < deadline) {
    const res = await hfFetch(`/requests/${encodeURIComponent(requestId)}/status`);
    if (!res.ok) throw new Error(`Higgsfield status取得失敗 (HTTP ${res.status})`);
    const data = await res.json() as {
      status?: string;
      video?: { url?: string };
      error?: string;
      message?: string;
    };
    const status = String(data.status || "").toLowerCase();
    if (status === "completed") {
      if (!data.video?.url) throw new Error("Higgsfieldは完了しましたが動画URLが返りませんでした");
      return data.video.url;
    }
    if (status === "failed" || status === "nsfw" || status === "canceled") {
      throw new Error(data.error || data.message || `Higgsfield生成失敗 (status=${status})`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error("Higgsfield生成がタイムアウトしました");
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

    const form = await req.formData();
    const image = form.get("image");
    const prompt = String(form.get("prompt") || "").trim();
    const model = String(form.get("model") || DEFAULT_MODEL);
    const requestedDuration = Number(form.get("duration") || 5);
    const duration = modelDurationClamp(model, requestedDuration);
    const aspectRatio = String(form.get("aspect_ratio") || "9:16");
    const sound = String(form.get("sound") || "on") === "on";
    if (!SUPPORTED_MODELS.has(model)) {
      return NextResponse.json({ error: "model が不正です" }, { status: 400 });
    }

    if (model !== "bytedance/seedance-2.5/text-to-video" && (!(image instanceof File) || !image.type.startsWith("image/"))) {
      return NextResponse.json({ error: "このモデルでは画像を1枚アップロードしてください" }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ error: "動画の内容を自然文で入力してください" }, { status: 400 });
    }
    if (!["9:16", "16:9", "1:1"].includes(aspectRatio)) {
      return NextResponse.json({ error: "aspect_ratio が不正です" }, { status: 400 });
    }

    const imageUrl = image instanceof File ? await uploadImage(image) : null;
    const baseInput = { prompt: prompt.slice(0, 5000), duration };
    const seedanceWithImage = model === "bytedance/seedance-2.5/text-to-video" && Boolean(imageUrl);
    const endpointModel = seedanceWithImage ? "bytedance/seedance-2.5/reference-to-video" : model;
    const input = model === "bytedance/seedance-2.5/text-to-video" && seedanceWithImage
      ? { ...baseInput, image_urls: [imageUrl!], resolution: "720p", aspect_ratio: aspectRatio, output_format: "mp4", generate_audio: sound }
      : model === "bytedance/seedance-2.5/text-to-video"
      ? { ...baseInput, resolution: "720p", aspect_ratio: aspectRatio, output_format: "mp4", generate_audio: sound }
      : model === "alibaba/wan-3.0-prime/image-to-video"
      ? { ...baseInput, image_url: imageUrl, aspect_ratio: aspectRatio, generate_audio: sound, resolution: "1080p", enable_thinking: false }
      : model === "minimax/h3/image-to-video"
        ? { ...baseInput, image_url: imageUrl, aspect_ratio: aspectRatio, resolution: "2K", aigc_watermark: false }
        : model === "kling-video/v3.0/pro/image-to-video"
          ? { ...baseInput, image_url: imageUrl, sound: sound ? "on" : "off", multi_shots: false }
          : { ...baseInput, image_url: imageUrl, resolution: "720p" };

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

    const videoUrl = await waitForVideo(queued.request_id);

    const consumed = await consumeVideoUsage(user.id, {
      provider: "higgsfield",
      product_name: "zenova-ai-video",
    }, { email: user.email });
    if (!consumed.ok) console.warn("[generate-higgsfield-video] usage consume failed", consumed.error);

    return NextResponse.json({
      video_url: videoUrl,
      request_id: queued.request_id,
      model: endpointModel,
      duration_sec: duration,
      aspect_ratio: aspectRatio,
      sound,
      elapsed_ms: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[generate-higgsfield-video] failed", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      elapsed_ms: Date.now() - startedAt,
    }, { status: 500 });
  }
}
