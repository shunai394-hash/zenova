import { NextResponse } from "next/server";
import { listGeneratedVideoHistory } from "@/lib/sales-data";

export const runtime = "nodejs";

/**
 * GET /api/history
 * generated_videos 一覧（履歴ページ用）
 */
export async function GET() {
  try {
    const payload = await listGeneratedVideoHistory(100);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({
      videos: [],
      supabase_ok: false,
      warnings: [error instanceof Error ? error.message : String(error)],
    });
  }
}
