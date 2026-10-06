import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordSalesFunnelEvent, SALES_FUNNEL_EVENTS, type SalesFunnelEventName } from "@/lib/sales-funnel/events";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = String(body.event ?? "") as SalesFunnelEventName;
    if (!SALES_FUNNEL_EVENTS.includes(event)) {
      return NextResponse.json({ error: "invalid event" }, { status: 400 });
    }

    const sessionId = String(body.session_id ?? "").trim();
    if (!sessionId || sessionId.length > 128) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 });
    }

    const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {};
    if (JSON.stringify(metadata).length > 4000) {
      return NextResponse.json({ error: "metadata too large" }, { status: 413 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    await recordSalesFunnelEvent({
      event,
      sessionId,
      path: typeof body.path === "string" ? body.path.slice(0, 500) : null,
      source: typeof body.source === "string" ? body.source.slice(0, 100) : null,
      medium: typeof body.medium === "string" ? body.medium.slice(0, 100) : null,
      campaign: typeof body.campaign === "string" ? body.campaign.slice(0, 200) : null,
      content: typeof body.content === "string" ? body.content.slice(0, 200) : null,
      metadata,
      userId: user?.id ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[funnel/event]", error);
    return NextResponse.json({ error: "event recording failed" }, { status: 500 });
  }
}
