import Stripe from "stripe";
import { isBillingPlanId, type BillingPlanId } from "@/lib/billing/plans";

/**
 * Stripe 接続ヘルパー。
 *
 * 必要 env:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET（webhook 署名検証・必須）
 * - NEXT_PUBLIC_APP_URL（Checkout 戻り先）
 * - STRIPE_PRICE_STARTER
 * - STRIPE_PRICE_PRO
 */

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY が未設定です");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET が未設定です");
  }
  return secret;
}

export function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

/** 環境変数の固定 Price ID */
export function getStripePriceIdForPlan(planId: string): string | null {
  const map: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    creator: process.env.STRIPE_PRICE_CREATOR,
    business: process.env.STRIPE_PRICE_BUSINESS,
  };
  const id = map[planId]?.trim();
  return id || null;
}

/** Price ID → plan_id */
export function planIdFromStripePriceId(
  priceId: string | null | undefined
): BillingPlanId | null {
  const id = priceId?.trim();
  if (!id) return null;

  const pairs: Array<[string | undefined, BillingPlanId]> = [
    [process.env.STRIPE_PRICE_STARTER, "starter"],
    [process.env.STRIPE_PRICE_PRO, "pro"],
    [process.env.STRIPE_PRICE_CREATOR, "creator"],
    [process.env.STRIPE_PRICE_BUSINESS, "business"],
  ];

  for (const [envPrice, planId] of pairs) {
    if (envPrice?.trim() && envPrice.trim() === id) return planId;
  }
  return null;
}

export function planIdFromStripeMetadata(
  metadata: Stripe.Metadata | null | undefined
): string | null {
  const planId = metadata?.plan_id?.trim().toLowerCase();
  if (!planId || planId === "free") return null;
  if (!isBillingPlanId(planId)) return null;
  return planId;
}

export function resolvePlanIdFromSubscription(
  subscription: Stripe.Subscription
): string | null {
  const fromMeta = planIdFromStripeMetadata(subscription.metadata);
  if (fromMeta) return fromMeta;

  const priceId = subscription.items?.data?.[0]?.price?.id;
  return planIdFromStripePriceId(priceId);
}
