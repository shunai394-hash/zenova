/**
 * 動画生成の月間上限・連続生成ガード（API側強制）。
 */

import {
  FREE_PLAN_VIDEO_ERROR,
  getVideoMonthlyLimit,
  startOfCurrentMonthJstIso,
  VIDEO_LIMIT_ERROR,
  VIDEO_RATE_LIMIT,
  VIDEO_RATE_LIMIT_ERROR,
} from "@/lib/billing/plans";
import {
  ensureActiveSubscription,
  sumUsageAmount,
  sumVideoCredits,
  countUsageSince,
} from "@/lib/usage/repository";
import type { UsageSummary, VideoLimitCheck } from "@/lib/usage/types";
import {
  getVideoTestDailyStatus,
  isVideoTestAccount,
  VIDEO_TEST_DAILY_LIMIT_ERROR,
} from "@/lib/usage/video-test-allowance";

/** プロセス内の直近リクエスト時刻（並列連打対策） */
const recentAttemptTimestamps = new Map<string, number[]>();

function buildSummary(input: {
  plan: string;
  video_limit: number;
  used: number;
  extra_credit: number;
}): UsageSummary {
  const planRemaining = Math.max(0, input.video_limit - input.used);
  const extra = Math.max(0, input.extra_credit);
  return {
    plan: input.plan,
    video_limit: input.video_limit,
    used: input.used,
    remaining: planRemaining + extra,
    extra_credit: extra,
  };
}

/**
 * 現在のプラン・今月の使用数・残クレジットを集計。
 * video_limit は billing/plans.ts の定数を正とする。
 */
export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const subscription = await ensureActiveSubscription(userId, "free");
  const planId = subscription.plan_id || "free";
  const videoLimit = getVideoMonthlyLimit(planId);
  const monthStart = startOfCurrentMonthJstIso();

  const used = await sumUsageAmount(userId, "video", monthStart);
  const extraCredit = await sumVideoCredits(userId);

  return buildSummary({
    plan: planId,
    video_limit: videoLimit,
    used,
    extra_credit: extraCredit,
  });
}

function pruneAndCountAttempts(userId: string, now: number): number {
  const windowMs = VIDEO_RATE_LIMIT.windowMs;
  const prev = recentAttemptTimestamps.get(userId) ?? [];
  const kept = prev.filter((t) => now - t < windowMs);
  recentAttemptTimestamps.set(userId, kept);
  return kept.length;
}

/** 生成開始時に呼び出し（連続生成の試行を記録） */
export function recordVideoGenerationAttempt(userId: string): void {
  const now = Date.now();
  const prev = recentAttemptTimestamps.get(userId) ?? [];
  const kept = prev.filter((t) => now - t < VIDEO_RATE_LIMIT.windowMs);
  kept.push(now);
  recentAttemptTimestamps.set(userId, kept);
}

export type VideoGenerationGuardResult = VideoLimitCheck & {
  code: "monthly" | "rate" | "free" | null;
};

export type CheckVideoLimitOptions = {
  /** Auth ユーザーの email（テスト用 Free 許可判定） */
  email?: string | null;
};

/**
 * 動画生成前ガード:
 * 0) Free プランは不可（許可リストのテストメールのみ例外・1日上限）
 * 1) 5分以内に3回以上（成功ログ or 直近試行）
 * 2) 今月の使用数 >= プラン上限
 *
 * DB障害時も無制限にはしない（安全側: 拒否 or 定数ベース）。
 */
export async function checkVideoLimit(
  userId: string,
  options?: CheckVideoLimitOptions
): Promise<VideoGenerationGuardResult> {
  const now = Date.now();
  const sinceIso = new Date(now - VIDEO_RATE_LIMIT.windowMs).toISOString();

  try {
    const summary = await getUsageSummary(userId);
    const planId = (summary.plan || "free").toLowerCase();

    if (planId === "free") {
      if (!isVideoTestAccount(options?.email)) {
        return {
          ...summary,
          remaining: 0,
          allowed: false,
          reason: FREE_PLAN_VIDEO_ERROR,
          bypassed: false,
          code: "free",
        };
      }

      const daily = await getVideoTestDailyStatus(userId);
      if (daily.remaining <= 0) {
        return {
          plan: summary.plan,
          video_limit: daily.limit,
          used: daily.used,
          remaining: 0,
          extra_credit: summary.extra_credit,
          allowed: false,
          reason: VIDEO_TEST_DAILY_LIMIT_ERROR,
          bypassed: true,
          code: "monthly",
        };
      }

      const recentDb = await countUsageSince(userId, "video", sinceIso);
      const recentAttempts = pruneAndCountAttempts(userId, now);
      const recentTotal = Math.max(recentDb, recentAttempts);
      if (recentTotal >= VIDEO_RATE_LIMIT.maxGenerations) {
        return {
          plan: summary.plan,
          video_limit: daily.limit,
          used: daily.used,
          remaining: daily.remaining,
          extra_credit: summary.extra_credit,
          allowed: false,
          reason: VIDEO_RATE_LIMIT_ERROR,
          bypassed: true,
          code: "rate",
        };
      }

      return {
        plan: summary.plan,
        video_limit: daily.limit,
        used: daily.used,
        remaining: daily.remaining,
        extra_credit: summary.extra_credit,
        allowed: true,
        reason: null,
        bypassed: true,
        code: null,
      };
    }

    // --- 連続生成 ---
    const recentDb = await countUsageSince(userId, "video", sinceIso);
    const recentAttempts = pruneAndCountAttempts(userId, now);
    const recentTotal = Math.max(recentDb, recentAttempts);

    if (recentTotal >= VIDEO_RATE_LIMIT.maxGenerations) {
      return {
        ...summary,
        allowed: false,
        reason: VIDEO_RATE_LIMIT_ERROR,
        bypassed: false,
        code: "rate",
      };
    }

    // --- 月間上限（プラン枠 + 追加クレジット） ---
    if (summary.remaining <= 0) {
      return {
        ...summary,
        allowed: false,
        reason: VIDEO_LIMIT_ERROR,
        bypassed: false,
        code: "monthly",
      };
    }

    return {
      ...summary,
      allowed: true,
      reason: null,
      bypassed: false,
      code: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[usage] checkVideoLimit failed (fail-closed):", message);

    const recentAttempts = pruneAndCountAttempts(userId, now);
    if (recentAttempts >= VIDEO_RATE_LIMIT.maxGenerations) {
      return {
        plan: "free",
        video_limit: getVideoMonthlyLimit("free"),
        used: 0,
        remaining: 0,
        extra_credit: 0,
        allowed: false,
        reason: VIDEO_RATE_LIMIT_ERROR,
        bypassed: false,
        code: "rate",
      };
    }

    return {
      plan: "free",
      video_limit: getVideoMonthlyLimit("free"),
      used: 0,
      remaining: 0,
      extra_credit: 0,
      allowed: false,
      reason: FREE_PLAN_VIDEO_ERROR,
      bypassed: false,
      code: "free",
    };
  }
}
