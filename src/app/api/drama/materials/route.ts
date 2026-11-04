import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const base = process.env.MPT_API_URL?.trim().replace(/\/$/, "");
  if (!base) return NextResponse.json({ error: "MoneyPrinterTurbo API URL が未設定です。" }, { status: 503 });

  try {
    const incoming = await request.formData();
    const file = incoming.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "動画または画像ファイルを選択してください。" }, { status: 400 });

    const imageFile = /[.](jpg|jpeg|png|bmp)$/i.test(file.name);
    const videoFile = /[.](mp4|mov|avi|flv|mkv|webm)$/i.test(file.name);
    if (!imageFile && !videoFile) return NextResponse.json({ error: "対応形式はMP4、MOV、AVI、FLV、MKV、WEBM、JPG、PNG、BMPです。" }, { status: 400 });
    const maxBytes = imageFile ? 20 * 1024 * 1024 : 200 * 1024 * 1024;
    if (file.size > maxBytes) return NextResponse.json({ error: imageFile ? "画像は20MB以下にしてください。" : "動画は200MB以下にしてください。" }, { status: 413 });

    const body = new FormData();
    body.append("file", file, file.name);
    const apiKey = process.env.MPT_API_KEY?.trim();
    const response = await fetch(`${base}/api/v1/video_materials`, {
      method: "POST",
      headers: { Accept: "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(50000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.status !== 200 || !payload.data?.file) {
      return NextResponse.json({ error: String(payload.message || payload.detail || `HTTP ${response.status}`).slice(0, 500) }, { status: response.status >= 400 ? response.status : 502 });
    }
    return NextResponse.json({ file: String(payload.data.file) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "素材アップロードに失敗しました。" }, { status: 502 });
  }
}
