import { NextRequest, NextResponse } from "next/server";
import { getTtsApiBaseUrl } from "@/lib/tts/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function buildTargetUrl(pathParts: string[], search: string): string {
  const base = getTtsApiBaseUrl();
  const suffix = pathParts.map((p) => encodeURIComponent(p)).join("/");
  return `${base}/${suffix}${search}`;
}

async function proxyRequest(
  req: NextRequest,
  pathParts: string[]
): Promise<NextResponse> {
  if (!pathParts.length) {
    return NextResponse.json(
      { error: "TTS path is required" },
      { status: 400 }
    );
  }

  const targetUrl = buildTargetUrl(pathParts, req.nextUrl.search);
  const headers = new Headers();

  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    if (lower === "origin" || lower === "referer") return;
    headers.set(key, value);
  });

  // JSON は UTF-8 明示（日本語テキストの文字化け防止）
  const contentType = headers.get("content-type");
  if (contentType?.includes("application/json") && !contentType.includes("charset")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Buffer.from(await req.arrayBuffer());
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "TTS upstream unreachable";
    return NextResponse.json(
      {
        error:
          "TTS API に接続できません。Voicebox が起動しているか、NEXT_PUBLIC_TTS_API_URL / TTS_API_URL を確認してください。",
        detail: message,
      },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers();
  const upstreamType = upstream.headers.get("content-type");
  if (upstreamType) {
    responseHeaders.set("content-type", upstreamType);
  }
  responseHeaders.set("cache-control", "no-store");

  // 音声ダウンロード用
  const disposition = upstream.headers.get("content-disposition");
  if (disposition) {
    responseHeaders.set("content-disposition", disposition);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}
