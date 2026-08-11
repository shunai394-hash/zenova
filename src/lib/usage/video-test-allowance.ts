/**
 * 開発・テスト用アカウント向けの Free 動画生成許可。
 * 本番の Free / Stripe 仕様は変更せず、許可リストのメールのみ例外。
 */

import { countUsageSince } from "./repository";

const DEFAULT_TEST_EMAIL = "shunai394@gmail.com";
const DEFAULT_DAILY_LIMIT = 5;

/** JST 当日 0:00 の ISO（usage 集計用） */
export function startOfCurrentDayJstIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return new Date(`${y}-${m}-${d}T00:00:00+09:00`).toISOString();
}

function parseAllowlist(): string[] {
  const fromEnv = (process.env.VIDEO_TEST_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const base = [DEFAULT_TEST_EMAIL.toLowerCase()];
  return Array.from(new Set([...base, ...fromEnv]));
}

export function getVideoTestDailyLimit(): number {
  const n = Number(process.env.VIDEO_TEST_DAILY_LIMIT);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return DEFAULT_DAILY_LIMIT;
}

export function isVideoTestAccount(email: string | null | undefined): boolean {
  const e = (email || "").trim().toLowerCase();
  if (!e) return false;
  return parseAllowlist().includes(e);
}

export type VideoTestDailyStatus = {
  limit: number;
  used: number;
  remaining: number;
};

/** テストアカウントの当日動画使用状況（usage_logs ベース） */
export async function getVideoTestDailyStatus(
  userId: string
): Promise<VideoTestDailyStatus> {
  const limit = getVideoTestDailyLimit();
  const used = await countUsageSince(
    userId,
    "video",
    startOfCurrentDayJstIso()
  );
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}

export const VIDEO_TEST_DAILY_LIMIT_ERROR =
  "テスト用アカウントの1日あたり動画生成上限に達しました。翌日再度お試しください。" as const;
