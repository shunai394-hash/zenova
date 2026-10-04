import { NextResponse } from "next/server";
import { listGeneratedVideoHistory } from "@/lib/sales-data";
import { requireAuthUser } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * GET /api/history
 * generated_videos 一覧（履歴ページ用）
 */
export async function GET() {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  try {
    const payload = await listGeneratedVideoHistory(100, user.id);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({
      videos: [],
      supabase_ok: false,
      warnings: [error instanceof Error ? error.message : String(error)],
    });
  }
}
