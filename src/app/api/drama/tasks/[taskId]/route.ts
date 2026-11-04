import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  const base = process.env.MPT_API_URL?.trim().replace(/\/$/, "");
  const { taskId } = await context.params;
  if (!base || !/^[a-zA-Z0-9-]{8,100}$/.test(taskId)) return NextResponse.json({ error: "無効なタスクIDまたはAPI設定です。" }, { status: 400 });

  try {
    const apiKey = process.env.MPT_API_KEY?.trim();
    const response = await fetch(`${base}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
      headers: { Accept: "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.status !== 200 || !payload.data) return NextResponse.json({ error: String(payload.message || payload.detail || `HTTP ${response.status}`).slice(0, 500) }, { status: response.status >= 400 ? response.status : 502 });
    const data = payload.data;
    return NextResponse.json({ task_id: data.task_id, state: data.state, progress: data.progress ?? 0, videos: data.combined_videos?.length ? data.combined_videos : data.videos ?? [], error: data.error ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "タスク状態の取得に失敗しました。" }, { status: 502 });
  }
}
