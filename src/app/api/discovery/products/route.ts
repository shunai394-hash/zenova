import { NextResponse } from "next/server";
import { getProductDiscovery } from "@/lib/product-discovery";

export const runtime = "nodejs";

/**
 * GET /api/discovery/products
 * 商品発見画面用（注目 / 高報酬 / 季節）
 */
export async function GET() {
  try {
    const payload = await getProductDiscovery();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[discovery/products] ERROR:", error);
    return NextResponse.json({
      featured: [],
      high_reward: [],
      seasonal: [],
      season: "summer",
      season_label: "夏のトレンド",
      supabase_ok: false,
      warnings: [error instanceof Error ? error.message : String(error)],
    });
  }
}
