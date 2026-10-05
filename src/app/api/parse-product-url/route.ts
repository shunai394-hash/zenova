import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

const MAX_HTML_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;

function isPrivateIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    );
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }
  return true;
}

async function assertPublicHttpUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("HTTP / HTTPS のURLのみ対応しています");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "metadata.google.internal"
  ) {
    throw new Error("このホストは取得対象にできません");
  }

  const addresses = isIP(hostname)
    ? [hostname]
    : (await lookup(hostname, { all: true })).map((entry) => entry.address);

  if (!addresses.length || addresses.some(isPrivateIp)) {
    throw new Error("プライベートネットワークのURLは取得対象にできません");
  }

  return url;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getMeta(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      "<meta[^>]+(?:property|name)=[\\\"']" +
        escaped +
        "[\\\"'][^>]+content=[\\\"']([^\\\"']+)[\\\"'][^>]*>",
      "i"
    ),
    new RegExp(
      "<meta[^>]+content=[\\\"']([^\\\"']+)[\\\"'][^>]+(?:property|name)=[\\\"']" +
        escaped +
        "[\\\"'][^>]*>",
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return "";
}

function getTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeHtml(match[1].replace(/<[^>]+>/g, "")) : "";
}

function getJsonLd(html: string): Record<string, unknown>[] {
  const blocks = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];
  const records: Record<string, unknown>[] = [];

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1].trim());
      const values = Array.isArray(parsed) ? parsed : [parsed];
      for (const value of values) {
        if (value && typeof value === "object") records.push(value);
      }
    } catch {
      // Ignore malformed third-party JSON-LD.
    }
  }
  return records;
}

function findProductJsonLd(records: Record<string, unknown>[]) {
  return records.find((record) => {
    const type = record["@type"];
    return type === "Product" || (Array.isArray(type) && type.includes("Product"));
  });
}

async function fetchPublicPage(initial: string): Promise<{ url: URL; html: string }> {
  let current = await assertPublicHttpUrl(initial);

  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      headers: {
        "User-Agent": "ZENOVA Product Analyzer/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || attempt === MAX_REDIRECTS) {
        throw new Error("リダイレクトが多すぎるか、遷移先を取得できません");
      }
      current = await assertPublicHttpUrl(new URL(location, current).toString());
      continue;
    }

    if (!response.ok) {
      throw new Error("商品ページの取得に失敗しました (HTTP " + response.status + ")");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      throw new Error("HTMLの商品ページではありません");
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_HTML_BYTES) {
      throw new Error("商品ページが大きすぎるため解析できません");
    }

    const html = new TextDecoder("utf-8").decode(buffer);
    return { url: current, html };
  }

  throw new Error("商品ページを取得できませんでした");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
    if (!rawUrl) {
      return NextResponse.json({ error: "url は必須です" }, { status: 400 });
    }

    const { url, html } = await fetchPublicPage(rawUrl);
    const records = getJsonLd(html);
    const product = findProductJsonLd(records);

    const name =
      (typeof product?.name === "string" ? product.name : "") ||
      getMeta(html, "og:title") ||
      getTitle(html);

    const description =
      (typeof product?.description === "string" ? product.description : "") ||
      getMeta(html, "og:description") ||
      getMeta(html, "description");

    const imageValue = product?.image;
    const imageRaw =
      typeof imageValue === "string"
        ? imageValue
        : Array.isArray(imageValue) && typeof imageValue[0] === "string"
          ? imageValue[0]
          : getMeta(html, "og:image");

    const imageUrl = imageRaw ? new URL(imageRaw, url).toString() : null;

    return NextResponse.json({
      success: true,
      source_url: url.toString(),
      product: {
        productName: name.slice(0, 300),
        description: description.slice(0, 3000),
        imageUrl,
      },
      fields_found: {
        name: Boolean(name),
        description: Boolean(description),
        image: Boolean(imageUrl),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "商品ページを解析できませんでした",
      },
      { status: 400 }
    );
  }
}
