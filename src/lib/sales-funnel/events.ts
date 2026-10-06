import { createSupabaseServerClient } from "@/lib/supabase/server";

export const SALES_FUNNEL_EVENTS = [
  "landing_view","cta_click","product_input","analysis_started",
  "video_generation_started","video_generation_succeeded",
  "video_generation_failed","pricing_view","checkout_started",
  "checkout_succeeded","lead_captured",
] as const;

export type SalesFunnelEventName = (typeof SALES_FUNNEL_EVENTS)[number];

export async function recordSalesFunnelEvent(input: {
  event: SalesFunnelEventName;
  sessionId: string;
  path?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  metadata?: Record<string, unknown>;
  userId?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("sales_funnel_events").insert({
    user_id: input.userId ?? null,
    session_id: input.sessionId,
    event_name: input.event,
    path: input.path ?? null,
    source: input.source ?? null,
    medium: input.medium ?? null,
    campaign: input.campaign ?? null,
    content: input.content ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}
