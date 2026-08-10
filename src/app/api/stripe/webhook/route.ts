import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  findUserIdByStripeCustomerId,
  setUserPlan,
} from "@/lib/usage";
import {
  getStripe,
  getStripeWebhookSecret,
  isStripeConfigured,
  planIdFromStripeMetadata,
  resolvePlanIdFromSubscription,
} from "@/lib/stripe/client";

export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 * - checkout.session.completed
 * - customer.subscription.updated
 * - customer.subscription.deleted
 *
 * 署名検証（STRIPE_WEBHOOK_SECRET）必須。
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe 未設定" }, { status: 503 });
  }

  let secret: string;
  try {
    secret = getStripeWebhookSecret();
  } catch (err) {
    console.error("[stripe/webhook] missing webhook secret", err);
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET が未設定です" },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("[stripe/webhook] verify failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(
          stripe,
          event.data.object as Stripe.Checkout.Session
        );
        break;
      }
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe/webhook] handler error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function resolveUserId(input: {
  metadataUserId?: string | null;
  clientReferenceId?: string | null;
  customerId?: string | null;
}): Promise<string | null> {
  const fromMeta = input.metadataUserId?.trim();
  if (fromMeta) return fromMeta;

  const fromRef = input.clientReferenceId?.trim();
  if (fromRef) return fromRef;

  const customerId = input.customerId?.trim();
  if (customerId) {
    return findUserIdByStripeCustomerId(customerId);
  }
  return null;
}

function customerIdOf(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  if ("deleted" in customer && customer.deleted) return customer.id ?? null;
  return customer.id ?? null;
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const planId =
    planIdFromStripeMetadata(session.metadata) ||
    (typeof session.subscription === "string"
      ? null
      : session.subscription && "metadata" in session.subscription
        ? planIdFromStripeMetadata(session.subscription.metadata)
        : null);

  const customerId = customerIdOf(session.customer);
  const userId = await resolveUserId({
    metadataUserId: session.metadata?.user_id,
    clientReferenceId: session.client_reference_id,
    customerId,
  });

  let subscriptionId: string | null =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  let resolvedPlan = planId;
  if ((!resolvedPlan || !subscriptionId) && subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    resolvedPlan = resolvedPlan || resolvePlanIdFromSubscription(sub);
    subscriptionId = sub.id;
  }

  if (!resolvedPlan || !userId) {
    console.warn("[stripe/webhook] checkout.session.completed missing ids", {
      planId: resolvedPlan,
      userId,
      sessionId: session.id,
    });
    return;
  }

  await setUserPlan(userId, resolvedPlan, {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    status: "active",
    metadata: {
      stripe_session_id: session.id,
      source: "checkout.session.completed",
    },
  });
  console.log("[stripe/webhook] plan activated", {
    userId,
    planId: resolvedPlan,
    customerId,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = customerIdOf(subscription.customer);
  const userId = await resolveUserId({
    metadataUserId: subscription.metadata?.user_id,
    customerId,
  });
  if (!userId) {
    console.warn("[stripe/webhook] subscription.updated missing user", {
      subscriptionId: subscription.id,
      customerId,
    });
    return;
  }

  const status = subscription.status;
  const inactive =
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete_expired";

  if (inactive) {
    await setUserPlan(userId, "free", {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: "active",
      metadata: {
        source: "customer.subscription.updated",
        stripe_status: status,
      },
    });
    console.log("[stripe/webhook] plan set free (inactive)", {
      userId,
      status,
    });
    return;
  }

  const planId = resolvePlanIdFromSubscription(subscription);
  if (!planId) {
    console.warn("[stripe/webhook] subscription.updated unknown plan", {
      subscriptionId: subscription.id,
      priceId: subscription.items?.data?.[0]?.price?.id,
    });
    return;
  }

  await setUserPlan(userId, planId, {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: status === "active" || status === "trialing" ? "active" : status,
    metadata: {
      source: "customer.subscription.updated",
      stripe_status: status,
    },
  });
  console.log("[stripe/webhook] plan updated", { userId, planId, status });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = customerIdOf(subscription.customer);
  const userId = await resolveUserId({
    metadataUserId: subscription.metadata?.user_id,
    customerId,
  });
  if (!userId) {
    console.warn("[stripe/webhook] subscription.deleted missing user", {
      subscriptionId: subscription.id,
      customerId,
    });
    return;
  }

  await setUserPlan(userId, "free", {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: "active",
    metadata: {
      source: "customer.subscription.deleted",
    },
  });
  console.log("[stripe/webhook] plan set free (deleted)", { userId });
}
