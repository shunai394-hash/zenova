import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { checkVideoLimit, consumeVideoUsage, hasVideoUsageForRequest } from "@/lib/usage";
import {
  createTicket,
  describeHiggsfieldFailure,
  normalizeHiggsfieldStatus,
  verifyTicket,
} from "@/lib/higgsfield/ticket";

export const runtime = "nodejs";
// 生成完了を待たずに request を受け付けて返す（照会は GET）。アップロード分の余裕のみ確保。
export const maxDuration = 120;

const HF_BASE = "https://api.higgsfield.ai";
const DEFAULT_MODEL = "alibaba/wan-3.0-prime/image-to-video";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
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

class HiggsfieldError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

async function hfFetch(path: string, init: RequestInit = {}, timeoutMs = 30_000) {
  const key = getApiKey();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Key ${key}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  try {
    return await fetch(`${HF_BASE}${path}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new HiggsfieldError("Higgsfieldへの接続がタイムアウトしました。時間をおいて再度お試しください。", 504);
    }
    throw new HiggsfieldError("Higgsfieldへ接続できませんでした。時間をおいて再度お試しください。", 502);
  }
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
    signal: AbortSignal.timeout(60_000),
  }).catch(() => {
    throw new HiggsfieldError("画像のアップロードが完了しませんでした。通信環境を確認して再度お試しください。", 504);
  });
  if (!put.ok) throw new Error(`Higgsfield画像アップロード失敗 (HTTP ${put.status})`);
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

    const form = await req.formData();
    const image = form.get("image");
    const prompt = String(form.get("prompt") || "").trim();
    const model = String(form.get("model") || DEFAULT_MODEL);
    const rawDuration = form.get("duration");
    const requestedDuration = rawDuration == null || rawDuration === "" ? 5 : Number(rawDuration);
    if (!Number.isFinite(requestedDuration) || requestedDuration <= 0) {
      return NextResponse.json({ error: "duration は正の数で指定してください" }, { status: 400 });
    }
    const duration = modelDurationClamp(model, requestedDuration);
    const aspectRatio = String(form.get("aspect_ratio") || "9:16");
    const sound = String(form.get("sound") || "on") === "on";
    if (!SUPPORTED_MODELS.has(model)) {
      return NextResponse.json({ error: "model が不正です" }, { status: 400 });
    }

    if (model !== "bytedance/seedance-2.5/text-to-video" && (!(image instanceof File) || !ALLOWED_IMAGE_TYPES.has(image.type))) {
      return NextResponse.json({ error: "このモデルでは JPG・PNG・WebP の画像を1枚アップロードしてください" }, { status: 400 });
    }
    if (image instanceof File) {
      if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
        return NextResponse.json({ error: "画像形式は JPG・PNG・WebP に対応しています" }, { status: 400 });
      }
      if (image.size <= 0 || image.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "画像サイズは 10MB 以下にしてください" }, { status: 413 });
      }
    }
    if (!prompt) {
      return NextResponse.json({ error: "動画の内容を自然文で入力してください" }, { status: 400 });
    }
    if (prompt.length > 5000) {
      return NextResponse.json({ error: "プロンプトは 5,000 文字以内で入力してください" }, { status: 400 });
    }
    if (!["9:16", "16:9", "1:1"].includes(aspectRatio)) {
      return NextResponse.json({ error: "aspect_ratio が不正です" }, { status: 400 });
    }

    const imageUrl = image instanceof File ? await uploadImage(image) : null;
    const baseInput = { prompt, duration };
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
      console.error("[generate-higgsfield-video] submit rejected", { status: submit.status, detail: detail.slice(0, 500) });
      throw new HiggsfieldError(
        submit.status === 402 || submit.status === 403
          ? "動画生成サービスの利用枠が不足しています。管理者にお問い合わせください。"
          : `Higgsfieldが生成リクエストを受け付けませんでした (HTTP ${submit.status})`,
        502
      );
    }

    const queued = await submit.json() as { request_id?: string };
    if (!queued.request_id) throw new Error("Higgsfieldのrequest_idが返りませんでした");

    const ticket = createTicket({
      request_id: queued.request_id,
      user_id: user.id,
      model: endpointModel,
      duration_sec: duration,
      aspect_ratio: aspectRatio,
      sound,
      issued_at: Date.now(),
    }, getApiKey());

    console.info("[generate-higgsfield-video] submitted", {
      request_id: queued.request_id,
      model: endpointModel,
      duration,
      elapsed_ms: Date.now() - startedAt,
    });

    return NextResponse.json({
      status: "queued",
      request_id: queued.request_id,
      ticket,
      model: endpointModel,
      duration_sec: duration,
      aspect_ratio: aspectRatio,
      sound,
      elapsed_ms: Date.now() - startedAt,
    }, { status: 202 });
  } catch (error) {
    console.error("[generate-higgsfield-video] submit failed", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      elapsed_ms: Date.now() - startedAt,
    }, { status: error instanceof HiggsfieldError ? error.status : 500 });
  }
}

/**
 * 生成ジョブの状態照会。完了時に一度だけ使用数を記録する（request_id で重複防止）。
 * GET /api/generate-higgsfield-video?ticket=...
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です", login_url: "/login" }, { status: 401 });
    }

    const rawTicket = req.nextUrl.searchParams.get("ticket") || "";
    if (!rawTicket || rawTicket.length > 4096) {
      return NextResponse.json({ error: "ticket が指定されていません" }, { status: 400 });
    }
    const verified = verifyTicket(rawTicket, getApiKey(), user.id);
    if (!verified.ok) {
      const status = verified.reason === "user_mismatch" ? 403 : verified.reason === "expired" ? 410 : 400;
      const message = verified.reason === "expired"
        ? "この生成ジョブの確認期限が切れました。もう一度生成してください。"
        : "生成ジョブを確認できませんでした。";
      return NextResponse.json({ error: message, reason: verified.reason }, { status });
    }
    const job = verified.job;

    const res = await hfFetch(`/requests/${encodeURIComponent(job.request_id)}/status`, {}, 15_000);
    if (!res.ok) {
      // 一時的な照会失敗はクライアントが再試行できるよう 503 で返す
      return NextResponse.json({
        error: `Higgsfieldの状態取得に失敗しました (HTTP ${res.status})`,
        retryable: true,
      }, { status: res.status === 404 ? 404 : 503 });
    }
    const data = await res.json() as {
      status?: string;
      video?: { url?: string };
      error?: string;
      message?: string;
    };
    const phase = normalizeHiggsfieldStatus(data.status);
    const base = {
      request_id: job.request_id,
      model: job.model,
      duration_sec: job.duration_sec,
      aspect_ratio: job.aspect_ratio,
      sound: job.sound,
    };

    if (phase === "failed") {
      console.warn("[generate-higgsfield-video] job failed", { request_id: job.request_id, status: data.status });
      return NextResponse.json({ ...base, status: "failed", error: describeHiggsfieldFailure(data.status, data.error || data.message) });
    }
    if (phase !== "completed") {
      return NextResponse.json({ ...base, status: phase });
    }
    if (!data.video?.url) {
      return NextResponse.json({ ...base, status: "failed", error: "Higgsfieldは完了しましたが動画URLが返りませんでした" });
    }

    try {
      const alreadyCounted = await hasVideoUsageForRequest(user.id, job.request_id);
      if (!alreadyCounted) {
        const consumed = await consumeVideoUsage(user.id, {
          provider: "higgsfield",
          product_name: "zenova-ai-video",
          request_id: job.request_id,
          model: job.model,
        }, { email: user.email });
        if (!consumed.ok) console.warn("[generate-higgsfield-video] usage consume failed", consumed.error);
      }
    } catch (error) {
      // 使用数の記録失敗で完成済み動画を返せなくなるのを避ける
      console.warn("[generate-higgsfield-video] usage dedupe check failed", error);
    }

    return NextResponse.json({ ...base, status: "completed", video_url: data.video.url });
  } catch (error) {
    console.error("[generate-higgsfield-video] status failed", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      retryable: true,
    }, { status: error instanceof HiggsfieldError ? error.status : 500 });
  }
}
