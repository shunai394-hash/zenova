import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const base = process.env.MPT_API_URL?.trim().replace(/\/$/, "");
  const path = request.nextUrl.searchParams.get("path") || "";
  const normalized = path.replace(/^\//, "");
  if (!base || !normalized.startsWith("tasks/") || normalized.includes("..")) return new Response("Invalid media path", { status: 400 });

  try {
    const apiKey = process.env.MPT_API_KEY?.trim();
    const upstream = await fetch(`${base}/${normalized.split("/").map(encodeURIComponent).join("/")}`, {
      headers: { ...(apiKey ? { "x-api-key": apiKey } : {}) },
      cache: "no-store", signal: AbortSignal.timeout(30000),
    });
    if (!upstream.ok || !upstream.body) return new Response("Media unavailable", { status: upstream.status || 502 });
    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "video/mp4",
        "Cache-Control": "private, max-age=60",
        ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length") as string } : {}),
      },
    });
  } catch {
    return new Response("Media proxy failed", { status: 502 });
  }
}
