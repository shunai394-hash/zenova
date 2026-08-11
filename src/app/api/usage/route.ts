import { NextResponse } from "next/server";
import { getOptionalAuthUser } from "@/lib/auth/session";
import { getUsageSummary } from "@/lib/usage";
import { getVideoMonthlyLimit } from "@/lib/billing/plans";
import {
  getVideoTestDailyStatus,
  isVideoTestAccount,
} from "@/lib/usage/video-test-allowance";

export const runtime = "nodejs";

/**
 * GET /api/usage
 *
 * ログインユーザーのプラン・利用状況。
 * 未ログイン時は Free（動画生成 0）として返す。
 */
export async function GET() {
  const user = await getOptionalAuthUser();

  if (!user) {
    return NextResponse.json({
      plan: "free",
      video_limit: getVideoMonthlyLimit("free"),
      used: 0,
      remaining: 0,
      extra_credit: 0,
      authenticated: false,
    });
  }

  try {
    const summary = await getUsageSummary(user.id);
    const plan = (summary.plan || "free").toLowerCase();
    let remaining = plan === "free" ? 0 : summary.remaining;
    let used = summary.used;
    let video_limit = summary.video_limit;
    let video_test_allowance = false;

    // テスト用アカウントのみ: Free でも当日残枠を返す（フロント課金ゲート通過用）
    if (plan === "free" && isVideoTestAccount(user.email)) {
      const daily = await getVideoTestDailyStatus(user.id);
      remaining = daily.remaining;
      used = daily.used;
      video_limit = daily.limit;
      video_test_allowance = true;
    }

    return NextResponse.json({
      plan,
      video_limit,
      used,
      remaining,
      extra_credit: summary.extra_credit,
      authenticated: true,
      user_id: user.id,
      ...(video_test_allowance ? { video_test_allowance: true } : {}),
    });
  } catch (error) {
    console.error("[usage] GET ERROR:", error);
    return NextResponse.json({
      plan: "free",
      video_limit: getVideoMonthlyLimit("free"),
      used: 0,
      remaining: 0,
      extra_credit: 0,
      authenticated: true,
      user_id: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
