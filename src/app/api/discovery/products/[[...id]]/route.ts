import { NextRequest, NextResponse } from "next/server";
import {
  getDiscoveryProductById,
  getProductDiscovery,
} from "@/lib/product-discovery";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id?: string[] }>;
};

/**
 * GET /api/discovery/products
 * GET /api/discovery/products/[id]
 *
 * 商品一覧と商品詳細を同じ optional catch-all route で処理し、
 * Vercel Serverless Function の重複を避ける。
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id = [] } = await params;

  if (id.length === 0) {
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

  if (id.length !== 1 || !id[0]) {
    return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
  }

  try {
    const product = await getDiscoveryProductById(id[0]);
    if (!product) {
      return NextResponse.json(
        { error: "商品が見つかりません" },
        { status: 404 }
      );
    }
    return NextResponse.json({ product });
  } catch (error) {
    console.error("[discovery/products/id] ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
