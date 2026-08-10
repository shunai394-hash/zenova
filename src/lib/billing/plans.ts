/**
 * プラン別の動画生成上限（定数が正）。
 * DB `plans.video_limit` / `price` も同値に揃えること（migration 参照）。
 */

export const BILLING_PLAN_IDS = [
  "free",
  "starter",
  "creator",
  "pro",
  "business",
] as const;

export type BillingPlanId = (typeof BILLING_PLAN_IDS)[number];

/** 公開する料金プラン（UI） */
export const PUBLIC_BILLING_PLAN_IDS = ["free", "starter", "pro"] as const;
export type PublicBillingPlanId = (typeof PUBLIC_BILLING_PLAN_IDS)[number];

/** 月間動画生成上限 */
export const VIDEO_MONTHLY_LIMITS: Record<BillingPlanId, number> = {
  free: 0,
  starter: 10,
  creator: 150,
  pro: 50,
  business: 500,
};

/** 月額（円）。表示・API 上書き用 */
export const PLAN_MONTHLY_PRICES: Record<BillingPlanId, number> = {
  free: 0,
  starter: 1980,
  creator: 9800,
  pro: 4980,
  business: 49800,
};

/** 連続生成制限: 5分以内に N 回以上なら拒否 */
export const VIDEO_RATE_LIMIT = {
  windowMs: 5 * 60 * 1000,
  maxGenerations: 3,
} as const;

export const VIDEO_LIMIT_ERROR =
  "今月の動画生成回数を超えました。料金プランをご確認ください。" as const;

export const VIDEO_RATE_LIMIT_ERROR =
  "短時間での連続生成は制限されています。しばらく待ってください。" as const;

export const FREE_PLAN_VIDEO_ERROR =
  "動画生成は有料プランでご利用いただけます。料金プランからアップグレードしてください。" as const;

export const VIDEO_ENGINE_PREPARING_MESSAGE =
  "動画生成エンジン接続準備中" as const;

export function isBillingPlanId(id: string): id is BillingPlanId {
  return (BILLING_PLAN_IDS as readonly string[]).includes(id);
}

export function isPublicBillingPlanId(id: string): id is PublicBillingPlanId {
  return (PUBLIC_BILLING_PLAN_IDS as readonly string[]).includes(id);
}

/** プラン ID → 月間動画上限（未知プランは Free 扱い） */
export function getVideoMonthlyLimit(planId: string | null | undefined): number {
  const id = (planId ?? "free").trim().toLowerCase();
  if (isBillingPlanId(id)) return VIDEO_MONTHLY_LIMITS[id];
  return VIDEO_MONTHLY_LIMITS.free;
}

export function getPlanMonthlyPrice(planId: string | null | undefined): number {
  const id = (planId ?? "free").trim().toLowerCase();
  if (isBillingPlanId(id)) return PLAN_MONTHLY_PRICES[id];
  return PLAN_MONTHLY_PRICES.free;
}

/** 有料プランか（free 以外） */
export function isPaidPlan(planId: string | null | undefined): boolean {
  const id = (planId ?? "free").trim().toLowerCase();
  return id !== "free" && isBillingPlanId(id);
}

/** 今月（Asia/Tokyo）の開始時刻 ISO */
export function startOfCurrentMonthJstIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  // JST 0:00 = UTC 前月/当日 15:00
  return new Date(`${y}-${m}-01T00:00:00+09:00`).toISOString();
}
