import { NextRequest, NextResponse } from "next/server";
import {
  getProductById,
  isProductAnalysis,
} from "@/lib/product-analysis";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "id が必要です" },
        { status: 400 }
      );
    }

    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json(
        { error: "商品が見つかりません" },
        { status: 404 }
      );
    }

    if (!isProductAnalysis(product.analysis)) {
      return NextResponse.json(
        { error: "分析JSONが不正です" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      product,
      analysis: product.analysis,
    });
  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    );
  }
}
