import Stripe from "stripe";
import { isBillingPlanId, type BillingPlanId } from "@/lib/billing/plans";

/**
 * Stripe 謗･邯壹・繝ｫ繝代・縲・
 *
 * 蠢・ｦ・env:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET・・ebhook 鄂ｲ蜷肴､懆ｨｼ繝ｻ蠢・茨ｼ・
 * - NEXT_PUBLIC_APP_URL・・heckout 謌ｻ繧雁・・・
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
throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return secret;
}

export function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionUrl) {
    return `https://${productionUrl.replace(/\/$/, "")}`;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

/** 迺ｰ蠅・､画焚縺ｮ蝗ｺ螳・Price ID */
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

/** Price ID 竊・plan_id */
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


