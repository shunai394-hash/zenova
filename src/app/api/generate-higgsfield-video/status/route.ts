import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { consumeVideoUsage } from "@/lib/usage";

export const runtime = "nodejs";

const HF_BASE = "https://api.higgsfield.ai";

function getApiKey() {
  const key = process.env.HIGGSFIELD_API_KEY?.trim() || process.env.HF_API_KEY?.trim();
  if (!key) throw new Error("HIGGSFIELD_API_KEY が設定されていません");
  return key.replace(/^Key\s+/i, "");
}

async function hfFetch(path: string) {
  const key = getApiKey();
  const headers = new Headers();
  headers.set("Authorization", `Key ${key}`);
  return fetch(`${HF_BASE}${path}`, {
    headers,
    cache: "no-store",
  });
}

function extractVideoUrl(data: Record<string, unknown>): string | null {
  const direct = [
    data.video_url,
    data.url,
    (data.video as Record<string, unknown> | undefined)?.url,
    (data.output as Record<string, unknown> | undefined)?.video_url,
    (data.output as Record<string, unknown> | undefined)?.url,
  ];
  return direct.find((value): value is string => typeof value === "string" && value.length > 0) ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "ログインが必要です", login_url: "/login" },
        { status: 401 }
      );
    }

    const requestId = req.nextUrl.searchParams.get("request_id")?.trim();
    if (!requestId) {
      return NextResponse.json({ error: "request_id が必要です" }, { status: 400 });
    }

    const res = await hfFetch(`/requests/${encodeURIComponent(requestId)}/status`);
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({
        status: "error",
        request_id: requestId,
        error: `Higgsfield status取得失敗 (HTTP ${res.status}): ${detail.slice(0, 500)}`,
      }, { status: 502 });
    }

    const data = await res.json() as Record<string, unknown>;
    const status = String(data.status || "").toLowerCase();
    const videoUrl = extractVideoUrl(data);

    if (["completed", "succeeded", "success", "done"].includes(status)) {
      if (!videoUrl) {
        return NextResponse.json({
          status: "error",
          request_id: requestId,
          error: "Higgsfieldは完了しましたが動画URLが返りませんでした",
        }, { status: 502 });
      }

      const consumed = await consumeVideoUsage(
        user.id,
        {
          provider: "higgsfield",
          product_name: "zenova-ai-video",
          request_id: requestId,
        },
        { email: user.email }
      );

      if (!consumed.ok) {
        console.warn("[generate-higgsfield-video/status] usage consume failed", consumed.error);
      }

      return NextResponse.json({
        status: "completed",
        request_id: requestId,
        video_url: videoUrl,
      });
    }

    if (["failed", "nsfw", "canceled", "cancelled", "error"].includes(status)) {
      return NextResponse.json({
        status: "failed",
        request_id: requestId,
        error:
          (typeof data.error === "string" && data.error) ||
          (typeof data.message === "string" && data.message) ||
          `Higgsfield生成失敗 (status=${status})`,
      });
    }

    return NextResponse.json({
      status: status || "processing",
      request_id: requestId,
    });
  } catch (error) {
    console.error("[generate-higgsfield-video/status] failed", error);
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
