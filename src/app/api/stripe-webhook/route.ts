import { NextRequest } from "next/server";
import { POST as webhookPost } from "@/app/api/stripe/webhook/route";

export const runtime = "nodejs";

/** Alias: POST /api/stripe-webhook → /api/stripe/webhook */
export async function POST(req: NextRequest) {
  return webhookPost(req);
}
