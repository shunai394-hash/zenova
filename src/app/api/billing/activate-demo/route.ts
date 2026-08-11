import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { setUserPlan } from "@/lib/usage";

export const runtime = "nodejs";

/**
 * POST /api/billing/activate-demo?plan=starter|pro
 *
 * 開発・検証用のデモプラン切替。
 * 本番で誤って有効化されないよう ALLOW_DEMO_BILLING=1 が必須。
 */
export async function POST(req: NextRequest) {
  try {
    if (process.env.ALLOW_DEMO_BILLING !== "1") {
      return NextResponse.json(
        { error: "Demo billing is disabled" },
        { status: 403 }
      );
    }

    const user = await requireAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Login required", login_url: "/login" },
        { status: 401 }
      );
    }

    const planId = String(
      new URL(req.url).searchParams.get("plan") ?? ""
    )
      .trim()
      .toLowerCase();

    if (planId !== "starter" && planId !== "pro") {
      return NextResponse.json(
        { error: "plan must be starter or pro" },
        { status: 400 }
      );
    }

    const subscription = await setUserPlan(user.id, planId, {
      status: "active",
      metadata: {
        demo: true,
        activated_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      ok: true,
      demo: true,
      plan_id: planId,
      subscription_id: subscription.id,
    });
  } catch (error) {
    console.error("[billing/activate-demo]", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
