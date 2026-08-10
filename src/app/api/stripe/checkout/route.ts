import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import {
  getPlanById,
  getStripeCustomerIdForUser,
  saveStripeCustomerId,
} from "@/lib/usage";
import {
  getAppBaseUrl,
  getStripe,
  getStripePriceIdForPlan,
  isStripeConfigured,
} from "@/lib/stripe/client";

export const runtime = "nodejs";

/**
 * POST /api/stripe/checkout
 * body: { plan_id }
 * → { url } Stripe Checkout Session（ログインユーザー必須）
 *
 * Stripe 未設定時: { demo: true, activate_url } を返す（デモ有効化へ誘導）
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    if (!user) {
      return NextResponse.json(
        {
          error: "ログインが必要です",
          login_url: "/login",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const planId = String(body.plan_id ?? body.plan ?? "")
      .trim()
      .toLowerCase();
    if (!planId) {
      return NextResponse.json({ error: "plan_id が必要です" }, { status: 400 });
    }
    if (planId === "free") {
      return NextResponse.json(
        { error: "Free プランは決済不要です" },
        { status: 400 }
      );
    }
    if (planId !== "starter" && planId !== "pro") {
      return NextResponse.json(
        { error: "対応プランは starter / pro のみです" },
        { status: 400 }
      );
    }

    const plan = await getPlanById(planId);
    if (!plan) {
      return NextResponse.json(
        { error: `プラン「${planId}」が見つかりません` },
        { status: 404 }
      );
    }

    const baseUrl = getAppBaseUrl();

    if (!isStripeConfigured()) {
      return NextResponse.json({
        demo: true,
        message:
          "STRIPE_SECRET_KEY 未設定のためデモモードです。デモでプランを有効化できます。",
        activate_url: `${baseUrl}/api/billing/activate-demo?plan=${encodeURIComponent(planId)}`,
        plan_id: planId,
        user_id: user.id,
      });
    }

    const priceId = getStripePriceIdForPlan(planId);
    if (!priceId) {
      return NextResponse.json(
        {
          error: `STRIPE_PRICE_${planId.toUpperCase()} が未設定です`,
        },
        { status: 500 }
      );
    }

    const stripe = getStripe();
    let customerId = await getStripeCustomerIdForUser(user.id);

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
      await saveStripeCustomerId(user.id, customerId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      success_url: `${baseUrl}/checkout?success=1&plan=${encodeURIComponent(planId)}`,
      cancel_url: `${baseUrl}/checkout?canceled=1&plan=${encodeURIComponent(planId)}`,
      client_reference_id: user.id,
      metadata: {
        plan_id: planId,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          plan_id: planId,
          user_id: user.id,
        },
      },
      line_items: [{ price: priceId, quantity: 1 }],
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout URL を作成できませんでした" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
      plan_id: planId,
      user_id: user.id,
      demo: false,
    });
  } catch (error) {
    console.error("[stripe/checkout]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
