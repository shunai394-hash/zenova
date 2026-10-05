import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const HF_BASE = "https://api.higgsfield.ai";

function getApiKey() {
  const key = process.env.HIGGSFIELD_API_KEY?.trim() || process.env.HF_API_KEY?.trim();
  if (!key) throw new Error("HIGGSFIELD_API_KEY が設定されていません");
  return key.replace(/^Key\s+/i, "");
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です", login_url: "/login" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestId = String(body.request_id || "").trim();
    if (!requestId) {
      return NextResponse.json({ error: "request_id が必要です" }, { status: 400 });
    }

    const res = await fetch(
      `${HF_BASE}/requests/${encodeURIComponent(requestId)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${getApiKey()}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const text = await res.text();
    let data: unknown = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `生成キャンセルに失敗しました (HTTP ${res.status})`, detail: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ status: "canceled", request_id: requestId, provider: data });
  } catch (error) {
    console.error("[generate-higgsfield-video/cancel] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
