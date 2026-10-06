import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const ORDER = [
  "landing_view","cta_click","product_input","analysis_started",
  "video_generation_started","video_generation_succeeded","video_generation_failed",
  "pricing_view","checkout_started","checkout_succeeded","lead_captured",
] as const;

export async function GET() {
  try {
    const user = await requireAuthUser();
    if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("sales_funnel_events")
      .select("event_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) throw error;

    const counts = Object.fromEntries(ORDER.map((event) => [event, 0])) as Record<string, number>;
    for (const row of data ?? []) {
      const event = String(row.event_name);
      if (event in counts) counts[event] += 1;
    }

    const first = counts.landing_view || 0;
    const stages = ORDER.map((event) => ({
      event,
      count: counts[event],
      rate_from_landing: first > 0 ? Math.round((counts[event] / first) * 1000) / 10 : 0,
    }));

    return NextResponse.json({ ok: true, total_events: data?.length ?? 0, stages });
  } catch (error) {
    console.error("[funnel/summary]", error);
    return NextResponse.json({ error: "funnel summary failed" }, { status: 500 });
  }
}
