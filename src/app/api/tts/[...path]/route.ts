import { NextRequest, NextResponse } from "next/server";
import { getTtsApiBaseUrl } from "@/lib/tts/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

  // Voicebox には必要なヘッダだけ渡す。
  // ブラウザの Host / Cookie / Accept-Encoding を転送すると上流が失敗することがある。
  const accept = req.headers.get("accept");
  if (accept) headers.set("accept", accept);
  const range = req.headers.get("range");
  if (range) headers.set("range", range);
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set(
      "content-type",
      contentType.includes("application/json") && !contentType.includes("charset")
        ? "application/json; charset=utf-8"
        : contentType
    );
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
