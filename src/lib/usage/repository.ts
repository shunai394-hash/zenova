import { supabase } from "@/lib/supabase";
import {
  DEFAULT_USAGE_USER_ID,
  type PlanRecord,
  type SetUserPlanOptions,
  type UsageLogRecord,
  type UsageType,
  type UserSubscriptionRecord,
  type VideoCreditRecord,
} from "./types";

export function resolveUsageUserId(input?: {
  user_id?: string | null;
  header_user_id?: string | null;
}): string {
  const fromBody = input?.user_id?.trim();
  if (fromBody) return fromBody;

  const fromHeader = input?.header_user_id?.trim();
  if (fromHeader) return fromHeader;

  const fromEnv = process.env.DEFAULT_USAGE_USER_ID?.trim();
  if (fromEnv) return fromEnv;

  return DEFAULT_USAGE_USER_ID;
}

export async function listPlans(): Promise<PlanRecord[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("price", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as PlanRecord[];
}

export async function getPlanById(planId: string): Promise<PlanRecord | null> {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PlanRecord | null) ?? null;
}

export async function getActiveSubscription(
  userId: string
): Promise<UserSubscriptionRecord | null> {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as UserSubscriptionRecord | null) ?? null;
}

/**
 * アクティブ契約が無ければ free を自動作成。
 */
export async function ensureActiveSubscription(
  userId: string,
  planId = "free"
): Promise<UserSubscriptionRecord> {
  const existing = await getActiveSubscription(userId);
  if (existing) return existing;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const { data, error } = await supabase
    .from("user_subscriptions")
    .insert([
      {
        user_id: userId,
        plan_id: planId,
        status: "active",
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString(),
      },
    ])
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as UserSubscriptionRecord;
}

/** ユーザーに紐づく Stripe Customer ID（最新の非 null） */
export async function getStripeCustomerIdForUser(
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const id = data?.stripe_customer_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export async function findUserIdByStripeCustomerId(
  customerId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return typeof data?.user_id === "string" ? data.user_id : null;
}

/** Customer ID を現在の active サブスク（なければ作成）に保存 */
export async function saveStripeCustomerId(
  userId: string,
  customerId: string
): Promise<void> {
  const sub = await ensureActiveSubscription(userId, "free");
  const { error } = await supabase
    .from("user_subscriptions")
    .update({ stripe_customer_id: customerId })
    .eq("id", sub.id);
  if (error) throw new Error(error.message);
}

/**
 * プランを切り替え（既存 active を canceled にして新規 period を開始）。
 */
export async function setUserPlan(
  userId: string,
  planId: string,
  options?: SetUserPlanOptions
): Promise<UserSubscriptionRecord> {
  const plan = await getPlanById(planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  const existing = await getActiveSubscription(userId);
  if (existing) {
    const { error: cancelError } = await supabase
      .from("user_subscriptions")
      .update({ status: "canceled" })
      .eq("id", existing.id);
    if (cancelError) throw new Error(cancelError.message);
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const stripeCustomerId =
    options?.stripe_customer_id?.trim() ||
    existing?.stripe_customer_id?.trim() ||
    null;
  const stripeSubscriptionId =
    options?.stripe_subscription_id?.trim() || null;

  const row: Record<string, unknown> = {
    user_id: userId,
    plan_id: planId,
    status: options?.status ?? "active",
    period_start: now.toISOString(),
    period_end: periodEnd.toISOString(),
  };

  if (stripeCustomerId) row.stripe_customer_id = stripeCustomerId;
  if (stripeSubscriptionId) row.stripe_subscription_id = stripeSubscriptionId;
  if (options?.metadata) row.metadata = options.metadata;

  const { data, error } = await supabase
    .from("user_subscriptions")
    .insert([row])
    .select("*")
    .single();

  if (error) {
    // 旧スキーマ（stripe / metadata カラム無し）向けフォールバック
    if (
      /stripe_customer_id|stripe_subscription_id|metadata/i.test(error.message)
    ) {
      const retry = await supabase
        .from("user_subscriptions")
        .insert([
          {
            user_id: userId,
            plan_id: planId,
            status: options?.status ?? "active",
            period_start: now.toISOString(),
            period_end: periodEnd.toISOString(),
          },
        ])
        .select("*")
        .single();
      if (retry.error) throw new Error(retry.error.message);
      return retry.data as UserSubscriptionRecord;
    }
    throw new Error(error.message);
  }

  return data as UserSubscriptionRecord;
}

export async function sumUsageAmount(
  userId: string,
  usageType: UsageType,
  periodStart: string
): Promise<number> {
  const { data, error } = await supabase
    .from("usage_logs")
    .select("amount")
    .eq("user_id", userId)
    .eq("usage_type", usageType)
    .gte("created_at", periodStart);

  if (error) throw new Error(error.message);

  return (data ?? []).reduce((sum, row) => {
    const amount = typeof row.amount === "number" ? row.amount : 0;
    return sum + amount;
  }, 0);
}

/** periodStart 以降のログ件数（amount 合算ではなく行数ベースの連続生成判定用にも可） */
export async function countUsageSince(
  userId: string,
  usageType: UsageType,
  sinceIso: string
): Promise<number> {
  const { data, error } = await supabase
    .from("usage_logs")
    .select("amount")
    .eq("user_id", userId)
    .eq("usage_type", usageType)
    .gte("created_at", sinceIso);

  if (error) throw new Error(error.message);

  return (data ?? []).reduce((sum, row) => {
    const amount = typeof row.amount === "number" ? row.amount : 1;
    return sum + amount;
  }, 0);
}

export async function sumVideoCredits(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("video_credits")
    .select("credits")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return (data ?? []).reduce((sum, row) => {
    const credits = typeof row.credits === "number" ? row.credits : 0;
    return sum + credits;
  }, 0);
}

export async function insertUsageLog(input: {
  user_id: string;
  usage_type: UsageType;
  amount?: number;
  metadata?: Record<string, unknown>;
}): Promise<UsageLogRecord> {
  const { data, error } = await supabase
    .from("usage_logs")
    .insert([
      {
        user_id: input.user_id,
        usage_type: input.usage_type,
        amount: input.amount ?? 1,
        metadata: input.metadata ?? {},
      },
    ])
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as UsageLogRecord;
}

export async function insertVideoCredit(input: {
  user_id: string;
  credits: number;
  source?: string;
}): Promise<VideoCreditRecord> {
  const { data, error } = await supabase
    .from("video_credits")
    .insert([
      {
        user_id: input.user_id,
        credits: input.credits,
        source: input.source ?? "bonus",
      },
    ])
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as VideoCreditRecord;
}

export async function probeUsageTables(): Promise<{
  ok: boolean;
  plans: boolean;
  user_subscriptions: boolean;
  usage_logs: boolean;
  video_credits: boolean;
  details: Record<string, string>;
}> {
  const details: Record<string, string> = {};

  const check = async (table: string): Promise<boolean> => {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (error) {
      details[table] = error.message;
      return false;
    }
    details[table] = "ok";
    return true;
  };

  const plans = await check("plans");
  const user_subscriptions = await check("user_subscriptions");
  const usage_logs = await check("usage_logs");
  const video_credits = await check("video_credits");

  return {
    ok: plans && user_subscriptions && usage_logs && video_credits,
    plans,
    user_subscriptions,
    usage_logs,
    video_credits,
    details,
  };
}
