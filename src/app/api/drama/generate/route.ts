import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function safeText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  const base = process.env.MPT_API_URL?.trim().replace(/\/$/, "");
  const source = process.env.MPT_VIDEO_SOURCE?.trim();
  const markedFree = process.env.MPT_VIDEO_SOURCE_IS_FREE === "true";
  if (!base || !source) return NextResponse.json({ error: "MoneyPrinterTurboまたは動画プロバイダーが未設定です。生成は開始していません。" }, { status: 503 });
  if (!markedFree) return NextResponse.json({ error: "選択中の動画プロバイダーが無料と確認されていないため、課金防止のため生成を停止しました。" }, { status: 409 });

  try {
    const input = await request.json();
    const title = safeText(input.title, 160);
    const genre = safeText(input.genre, 80);
    const script = safeText(input.script, 12000);
    const terms = safeText(input.keywords, 2000).split(/[,，、\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 30);
    if (!title || !script || !terms.length) return NextResponse.json({ error: "作品タイトル、シナリオ、シーンキーワードを入力してください。" }, { status: 400 });

    const apiKey = process.env.MPT_API_KEY?.trim();
    const response = await fetch(`${base}/api/v1/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
      body: JSON.stringify({
        video_subject: `${title} / ${genre}`, video_script: script, video_terms: terms,
        video_aspect: "9:16", video_fit_mode: "cover", image_motion: "zoom",
        video_concat_mode: "sequential", video_transition_mode: null,
        video_clip_duration: 5, video_clip_speed: 1, video_count: 1,
        match_materials_to_script: true, video_source: source, video_language: "ja-JP",
        voice_name: "ja-JP-NanamiNeural", voice_volume: 1, voice_rate: 1,
        bgm_type: "random", bgm_volume: 0.15, subtitle_enabled: input.captions_on !== false,
        subtitle_position: "bottom", font_size: 54, text_fore_color: "#FFFFFF",
        stroke_color: "#000000", stroke_width: 2,
      }),
      cache: "no-store", signal: AbortSignal.timeout(20000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.status !== 200 || !payload.data?.task_id) {
      const detail = payload.message || payload.detail || `HTTP ${response.status}`;
      return NextResponse.json({ error: `MoneyPrinterTurbo: ${String(detail).slice(0, 500)}` }, { status: response.status >= 400 ? response.status : 502 });
    }
    return NextResponse.json({ task_id: String(payload.data.task_id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "動画生成リクエストに失敗しました。" }, { status: 502 });
  }
}
