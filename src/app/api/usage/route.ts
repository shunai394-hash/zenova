import { NextResponse } from "next/server";
import { getOptionalAuthUser } from "@/lib/auth/session";
import { getUsageSummary } from "@/lib/usage";
import { getVideoMonthlyLimit } from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * GET /api/usage
 *
 * ログインユーザーのプラン・利用状況。
 * 未ログイン時は Free（動画生成 0）として返す。
 */
export async function GET() {
  // Cookie セッション（Proxy 更新済み）からユーザーを解決
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
    const remaining = plan === "free" ? 0 : summary.remaining;

    return NextResponse.json({
      plan,
      video_limit: summary.video_limit,
      used: summary.used,
      remaining,
      extra_credit: summary.extra_credit,
      authenticated: true,
      user_id: user.id,
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
