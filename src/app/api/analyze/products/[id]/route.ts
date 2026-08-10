import { NextResponse } from "next/server";
import { getProductForAnalyze } from "@/lib/analyze/load-product";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/analyze/products/[id]
 * analyze?id=... 用の商品取得（DB products）
 */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const productId = String(id ?? "").trim();
    if (!productId) {
      return NextResponse.json(
        { error: "id が必要です", product: null },
        { status: 400 }
      );
    }

    const product = await getProductForAnalyze(productId);
    if (!product) {
      return NextResponse.json(
        { error: "商品が見つかりません", product: null },
        { status: 404 }
      );
    }

    return NextResponse.json({ product, analysis: product.analysis });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        product: null,
      },
      { status: 500 }
    );
  }
}
