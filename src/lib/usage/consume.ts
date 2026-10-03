import { ensureActiveSubscription } from "./repository";
import type { UsageSummary } from "./types";
import { getUsageSummary } from "./check-limit";
import { supabase } from "@/lib/supabase";
import {
  getVideoMonthlyLimit,
  startOfCurrentMonthJstIso,
} from "@/lib/billing/plans";
import {
  getVideoTestDailyLimit,
  isVideoTestAccount,
  startOfCurrentDayJstIso,
  VIDEO_TEST_DAILY_LIMIT_ERROR,
} from "./video-test-allowance";

/**
 * 動画生成成功後の使用数をDBで原子的に記録する。
 *
 * request_id は必須。DB側の advisory lock + unique index により、
 * 同時ポーリング・リトライでも二重計上せず、利用枠を超えて消費しない。
 */
export async function consumeVideoUsage(
  userId: string,
  metadata: Record<string, unknown> & { request_id?: string },
  options?: { email?: string | null }
): Promise<{
  ok: boolean;
  summary: UsageSummary | null;
  error: string | null;
}> {
  try {
    const requestId =
      typeof metadata.request_id === "string" ? metadata.request_id.trim() : "";
    if (!requestId) {
      return {
        ok: false,
        summary: null,
        error: "動画利用量の記録に request_id が必要です",
      };
    }

    const subscription = await ensureActiveSubscription(userId, "free");
    const planId = subscription.plan_id || "free";
    const videoLimit = getVideoMonthlyLimit(planId);
    const monthStart = startOfCurrentMonthJstIso();
    const dailyStart = startOfCurrentDayJstIso();
    const testAccount =
      planId === "free" && isVideoTestAccount(options?.email);

    const { data, error } = await supabase.rpc("consume_video_usage_atomic", {
      p_user_id: userId,
      p_request_id: requestId,
      p_plan_limit: videoLimit,
      p_period_start: monthStart,
      p_daily_start: dailyStart,
      p_test_allowance_limit: getVideoTestDailyLimit(),
      p_use_test_allowance: testAccount,
      p_metadata: metadata,
    });

    if (error) throw new Error(error.message);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("動画利用量の記録結果が返りませんでした");

    const ok = Boolean(row.ok);
    if (!ok) {
      return {
        ok: false,
        summary: await getUsageSummary(userId),
        error:
          typeof row.error === "string"
            ? row.error
            : "動画生成の利用上限に達しています",
      };
    }

    const summary: UsageSummary = {
      plan: planId,
      video_limit: testAccount && row.consumed_from === "test_allowance"
        ? getVideoTestDailyLimit()
        : videoLimit,
      used:
        typeof row.used === "number"
          ? row.used
          : Number(row.used ?? 0),
      remaining:
        typeof row.remaining === "number"
          ? row.remaining
          : Number(row.remaining ?? 0),
      extra_credit:
        typeof row.extra_credit === "number"
          ? row.extra_credit
          : Number(row.extra_credit ?? 0),
    };

    return { ok: true, summary, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[usage] atomic consumeVideoUsage failed:", message);
    return { ok: false, summary: null, error: message };
  }
}

export { VIDEO_TEST_DAILY_LIMIT_ERROR };
