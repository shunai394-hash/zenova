import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { setUserPlan } from "@/lib/usage";
import { getAppBaseUrl, isStripeConfigured } from "@/lib/stripe/client";

export const runtime = "nodejs";

/**
 * POST /api/billing/activate-demo
 * Stripe 未設定時の開発用プラン有効化。
 * GET でも同処理（Checkout からのリダイレクト用）。
 * ログインユーザー必須。
 */
async function activate(req: NextRequest) {
  if (
    isStripeConfigured() &&
    process.env.ALLOW_DEMO_BILLING !== "1"
  ) {
    return NextResponse.json(
      {
        error:
          "Stripe 設定済みのためデモ有効化は無効です。ALLOW_DEMO_BILLING=1 で許可できます。",
      },
      { status: 403 }
    );
  }

  const user = await requireAuthUser();
  if (!user) {
    const base = getAppBaseUrl();
    if (req.method === "GET") {
      return NextResponse.redirect(`${base}/login?next=/pricing`);
    }
    return NextResponse.json(
      { error: "ログインが必要です", login_url: "/login" },
      { status: 401 }
    );
  }

  let planId = "";

  if (req.method === "GET") {
    const url = new URL(req.url);
    planId = (url.searchParams.get("plan") ?? "").trim().toLowerCase();
  } else {
    const body = await req.json().catch(() => ({}));
    planId = String(body.plan_id ?? body.plan ?? "")
      .trim()
      .toLowerCase();
  }

  if (!planId || planId === "free") {
    return NextResponse.json(
      { error: "有効な有料プラン ID が必要です" },
      { status: 400 }
    );
  }
  if (planId !== "starter" && planId !== "pro") {
    return NextResponse.json(
      { error: "対応プランは starter / pro のみです" },
      { status: 400 }
    );
  }

  const sub = await setUserPlan(user.id, planId, {
    metadata: { source: "demo" },
  });
  const base = getAppBaseUrl();

  if (req.method === "GET") {
    return NextResponse.redirect(
      `${base}/checkout?success=1&demo=1&plan=${encodeURIComponent(planId)}`
    );
  }

  return NextResponse.json({
    ok: true,
    plan_id: planId,
    user_id: user.id,
    subscription_id: sub.id,
    redirect: `${base}/checkout?success=1&demo=1&plan=${encodeURIComponent(planId)}`,
  });
}

export async function POST(req: NextRequest) {
  try {
    return await activate(req);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    return await activate(req);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
