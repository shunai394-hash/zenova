import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Higgsfield 生成ジョブの照会チケット。
 * request_id をログインユーザーに束縛し、他人のジョブ照会・使用量の付け替えを防ぐ。
 * DB を増やさず、サーバー秘密鍵による HMAC 署名で改ざんを検出する。
 */
export type VideoJobTicket = {
  request_id: string;
  user_id: string;
  model: string;
  duration_sec: number;
  aspect_ratio: string;
  sound: boolean;
  issued_at: number;
};

/** チケットの有効期限（生成完了後の再取得も含めて余裕を持たせる） */
export const TICKET_TTL_MS = 6 * 60 * 60 * 1000;

const TICKET_CONTEXT = "zenova:higgsfield-video-ticket:v1";

function deriveKey(secret: string) {
  return createHmac("sha256", secret).update(TICKET_CONTEXT).digest();
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", deriveKey(secret)).update(payload).digest("base64url");
}

export function createTicket(job: VideoJobTicket, secret: string): string {
  const payload = Buffer.from(JSON.stringify(job), "utf8").toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export type TicketVerification =
  | { ok: true; job: VideoJobTicket }
  | { ok: false; reason: "malformed" | "signature" | "expired" | "user_mismatch" };

export function verifyTicket(
  ticket: string,
  secret: string,
  userId: string,
  now = Date.now()
): TicketVerification {
  const parts = ticket.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };
  const [payload, signature] = parts;

  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, reason: "signature" };
  }

  let job: VideoJobTicket;
  try {
    job = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as VideoJobTicket;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof job?.request_id !== "string" || typeof job.user_id !== "string" || typeof job.issued_at !== "number") {
    return { ok: false, reason: "malformed" };
  }
  if (job.user_id !== userId) return { ok: false, reason: "user_mismatch" };
  if (now - job.issued_at > TICKET_TTL_MS || job.issued_at - now > 60_000) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, job };
}

export type HiggsfieldJobPhase = "queued" | "in_progress" | "completed" | "failed";

/** Higgsfield の status 文字列をアプリ内の状態へ正規化 */
export function normalizeHiggsfieldStatus(raw: unknown): HiggsfieldJobPhase {
  const status = String(raw ?? "").toLowerCase();
  if (status === "completed") return "completed";
  if (status === "failed" || status === "nsfw" || status === "canceled" || status === "cancelled") return "failed";
  if (status === "queued" || status === "pending" || status === "") return "queued";
  return "in_progress";
}

/** 失敗理由をユーザー向けの日本語に変換 */
export function describeHiggsfieldFailure(raw: unknown, detail?: string | null): string {
  const status = String(raw ?? "").toLowerCase();
  if (status === "nsfw") return "安全性フィルターにより生成が停止されました。プロンプトや画像の内容を変更してお試しください。";
  if (status === "canceled" || status === "cancelled") return "生成がキャンセルされました。";
  return detail?.trim() ? `生成に失敗しました：${detail.trim().slice(0, 300)}` : "生成に失敗しました。時間をおいて再度お試しください。";
}
