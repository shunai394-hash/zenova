import { NextResponse } from "next/server";
import { listGeneratedVideoHistory } from "@/lib/sales-data/video-history";

export const runtime = "nodejs";

/**
 * GET /api/dashboard/videos
 *
 * generated_videos 履歴（商品名・Hook・Selling angle 付き）。
 * 既存 /api/dashboard は変更しない。失敗時は 200 + 空配列。
 */
export async function GET() {
  try {
    const payload = await listGeneratedVideoHistory(50);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[dashboard/videos] ERROR:", error);
    return NextResponse.json({
      videos: [],
      supabase_ok: false,
      warnings: [error instanceof Error ? error.message : String(error)],
    });
  }
}
