import { NextResponse } from "next/server";
import { listPlans } from "@/lib/usage";
import type { PlanRecord } from "@/lib/usage";
import {
  getPlanMonthlyPrice,
  getVideoMonthlyLimit,
  isBillingPlanId,
  isPublicBillingPlanId,
  PUBLIC_BILLING_PLAN_IDS,
} from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * GET /api/plans
 * video_limit / price は billing/plans.ts の定数で上書き。
 * 公開プラン（free / starter / pro）を優先して返す。
 */
export async function GET() {
  try {
    const all = await listPlans();
    const mapped = all.map((plan) => ({
      ...plan,
      video_limit: isBillingPlanId(plan.id)
        ? getVideoMonthlyLimit(plan.id)
        : plan.video_limit,
      price: isBillingPlanId(plan.id)
        ? getPlanMonthlyPrice(plan.id)
        : plan.price,
    }));

    const publicPlans = PUBLIC_BILLING_PLAN_IDS.map((id) =>
      mapped.find((p) => p.id === id)
    ).filter((p): p is PlanRecord => Boolean(p));

    const plans =
      publicPlans.length > 0
        ? publicPlans
        : mapped.filter((p) => isPublicBillingPlanId(p.id));

    return NextResponse.json({
      plans,
      supabase_ok: true,
      warnings: [] as string[],
    });
  } catch (error) {
    console.error("[plans] GET ERROR:", error);
    return NextResponse.json({
      plans: [] as PlanRecord[],
      supabase_ok: false,
      warnings: [error instanceof Error ? error.message : String(error)],
    });
  }
}
