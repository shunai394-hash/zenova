import { NextResponse } from "next/server";
import {
  getEmptySalesDashboard,
  getSalesDashboard,
} from "@/lib/sales-data/dashboard";

export const runtime = "nodejs";

/**
 * GET /api/dashboard
 *
 * products / sales_scenarios / generated_videos から Dashboard 用データを返す。
 * Supabase 失敗時は 200 + 空データ（画面を壊さない）。
 */
export async function GET() {
  try {
    const payload = await getSalesDashboard({
      recentLimit: 12,
      rankingLimit: 10,
      videoLimit: 12,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[dashboard] ERROR:", error);
    const empty = getEmptySalesDashboard();
    empty.warnings = [
      error instanceof Error ? error.message : String(error),
    ];
    return NextResponse.json(empty);
  }
}
