import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const HF_BASE = "https://api.higgsfield.ai";

function getCancelSecret(): string {
  const secret =
    process.env.HIGGSFIELD_CANCEL_SECRET?.trim() ||
    process.env.HIGGSFIELD_API_KEY?.trim() ||
    process.env.HF_API_KEY?.trim();
  if (!secret) throw new Error("HIGGSFIELD_CANCEL_SECRET が設定されていません");
  return secret;
}

function expectedCancelToken(userId: string, requestId: string): string {
  return createHmac("sha256", getCancelSecret())
    .update(`zenova:cancel:${userId}:${requestId}`)
    .digest("hex");
}

function tokenMatches(expected: string, actual: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(actual)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

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
    const cancelToken = String(body.cancel_token || "").trim();
    if (!requestId || !cancelToken) {
      return NextResponse.json({ error: "request_id と cancel_token が必要です" }, { status: 400 });
    }

    if (!tokenMatches(expectedCancelToken(user.id, requestId), cancelToken)) {
      return NextResponse.json({ error: "この生成リクエストをキャンセルする権限がありません" }, { status: 403 });
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
