import {
  ensureActiveSubscription,
  insertUsageLog,
  insertVideoCredit,
  sumUsageAmount,
  sumVideoCredits,
} from "./repository";
import type { UsageSummary } from "./types";
import { getUsageSummary } from "./check-limit";
import {
  getVideoMonthlyLimit,
  startOfCurrentMonthJstIso,
} from "@/lib/billing/plans";
import {
  getVideoTestDailyStatus,
  isVideoTestAccount,
  VIDEO_TEST_DAILY_LIMIT_ERROR,
} from "./video-test-allowance";

/**
 * 動画生成成功（generated_videos 保存後）に使用数を記録。
 * 失敗した生成では呼ばないこと。
 */
export async function consumeVideoUsage(
  userId: string,
  metadata: Record<string, unknown> = {},
  options?: { email?: string | null }
): Promise<{
  ok: boolean;
  summary: UsageSummary | null;
  error: string | null;
}> {
  try {
    const subscription = await ensureActiveSubscription(userId, "free");
    const planId = subscription.plan_id || "free";
    const videoLimit = getVideoMonthlyLimit(planId);
    const monthStart = startOfCurrentMonthJstIso();

    const used = await sumUsageAmount(userId, "video", monthStart);
    const extraCredit = await sumVideoCredits(userId);
    const planRemaining = Math.max(0, videoLimit - used);
    const remaining = planRemaining + Math.max(0, extraCredit);

    const testAccount = isVideoTestAccount(options?.email);
    let consumeViaTestAllowance = false;

    if (remaining <= 0) {
      if (!testAccount || planId !== "free") {
        return {
          ok: false,
          summary: await getUsageSummary(userId),
          error: "動画生成の利用上限に達しています",
        };
      }
      const daily = await getVideoTestDailyStatus(userId);
      if (daily.remaining <= 0) {
        return {
          ok: false,
          summary: {
            plan: planId,
            video_limit: daily.limit,
            used: daily.used,
            remaining: 0,
            extra_credit: extraCredit,
          },
          error: VIDEO_TEST_DAILY_LIMIT_ERROR,
        };
      }
      consumeViaTestAllowance = true;
    }

    await insertUsageLog({
      user_id: userId,
      usage_type: "video",
      amount: 1,
      metadata: {
        ...metadata,
        consumed_from: consumeViaTestAllowance
          ? "test_allowance"
          : planRemaining > 0
            ? "plan"
            : "credit",
        counted_at: "generated_videos_save",
      },
    });

    if (!consumeViaTestAllowance && planRemaining <= 0) {
      await insertVideoCredit({
        user_id: userId,
        credits: -1,
        source: "consume",
      });
    }

    if (consumeViaTestAllowance) {
      const daily = await getVideoTestDailyStatus(userId);
      return {
        ok: true,
        summary: {
          plan: planId,
          video_limit: daily.limit,
          used: daily.used,
          remaining: daily.remaining,
          extra_credit: extraCredit,
        },
        error: null,
      };
    }

    const summary = await getUsageSummary(userId);
    return { ok: true, summary, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[usage] consumeVideoUsage failed:", message);
    return { ok: false, summary: null, error: message };
  }
}
