import { createHmac } from "crypto";

export function stripDataUrl(imageBase64: string): string {
  return imageBase64.replace(/^data:image\/\w+;base64,/, "");
}

export function toDataUrl(imageBase64: string, mime = "image/png"): string {
  if (imageBase64.startsWith("data:")) return imageBase64;
  return `data:${mime};base64,${imageBase64}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function base64UrlEncode(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** HS256 JWT（外部ライブラリなし） */
export function signJwtHs256(
  payload: Record<string, unknown>,
  secret: string
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${data}.${signature}`;
}

export async function downloadMp4(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`動画ダウンロード失敗 (${res.status})`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  const bytes = Buffer.from(await res.arrayBuffer());
  if (
    contentType &&
    !contentType.includes("video") &&
    !contentType.includes("octet-stream") &&
    bytes.length < 1000
  ) {
    throw new Error(`動画ではない応答: ${contentType}`);
  }
  return bytes;
}

export function mapDurationForKling(durationSec: number): "5" | "10" {
  return durationSec > 7 ? "10" : "5";
}

export function mapDurationForLuma(durationSec: number): "5s" | "9s" {
  return durationSec > 7 ? "9s" : "5s";
}

export function getPublicBaseUrl(): string | null {
  const raw =
    process.env.LUMA_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    null;
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}

/** HTTP失敗時の詳細ログ用（ステータス + 本文） */
export async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 800);
  } catch {
    return "(body unreadable)";
  }
}

export function logProviderHttpFailure(input: {
  provider: string;
  step: string;
  method: string;
  url: string;
  status: number;
  body: string;
  requestJson?: string;
  jwtSummary?: string;
}): void {
  console.error(
    `[video-provider:${input.provider}] FAIL step=${input.step} ` +
      `${input.method} ${input.url} http_status=${input.status} ` +
      `response_body=${input.body}`
  );
  if (input.jwtSummary) {
    console.error(
      `[video-provider:${input.provider}] FAIL jwt=${input.jwtSummary}`
    );
  }
  if (input.requestJson) {
    console.error(
      `[video-provider:${input.provider}] FAIL request_json=${input.requestJson}`
    );
  }
}

/** ログ用: 画像 base64 を短縮したリクエスト JSON */
export function redactRequestJsonForLog(
  body: Record<string, unknown>,
  imageKey = "image"
): string {
  const clone: Record<string, unknown> = { ...body };
  const image = clone[imageKey];
  if (typeof image === "string") {
    clone[imageKey] =
      image.length > 120
        ? `${image.slice(0, 48)}...(${image.length} chars)...${image.slice(-24)}`
        : image;
  }
  return JSON.stringify(clone);
}

/** ログ用: JWT のヘッダ/ペイロード（署名は出さない） */
export function summarizeJwt(token: string): string {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return `invalid_token parts=${parts.length} len=${token.length}`;
    }
    const decode = (part: string) => {
      const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
      return Buffer.from(
        padded.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      ).toString("utf8");
    };
    const header = decode(parts[0]);
    const payload = decode(parts[1]);
    return `header=${header} payload=${payload} token_len=${token.length} sig_prefix=${parts[2]?.slice(0, 8) ?? ""}`;
  } catch (error) {
    return `jwt_parse_error=${error instanceof Error ? error.message : String(error)} token_len=${token.length}`;
  }
}
