import { NextRequest } from "next/server";
import { POST as checkoutPost } from "@/app/api/stripe/checkout/route";

export const runtime = "nodejs";

/** Alias: POST /api/create-checkout-session → /api/stripe/checkout */
export async function POST(req: NextRequest) {
  return checkoutPost(req);
}
