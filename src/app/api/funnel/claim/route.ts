import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body.session_id ?? "").trim();
    if (!sessionId || sessionId.length > 128) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("sales_funnel_events")
      .update({ user_id: user.id })
      .is("user_id", null)
      .eq("session_id", sessionId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[funnel/claim]", error);
    return NextResponse.json({ error: "funnel claim failed" }, { status: 500 });
  }
}
