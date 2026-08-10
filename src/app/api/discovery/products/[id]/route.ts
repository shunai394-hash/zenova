import { NextRequest, NextResponse } from "next/server";
import { getDiscoveryProductById } from "@/lib/product-discovery";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/discovery/products/[id]
 * 発見画面用の商品詳細（既存 /api/products/[id] は変更しない）
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id が必要です" }, { status: 400 });
    }

    const product = await getDiscoveryProductById(id);
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
