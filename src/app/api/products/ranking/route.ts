import { NextRequest, NextResponse } from "next/server";
import { getProductRanking } from "@/lib/product-analysis";

export async function GET(req: NextRequest) {
  try {
    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = Math.min(30, Math.max(1, Number(limitParam) || 10));

    const payload = await getProductRanking(limit);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("PRODUCT RANKING ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        ranking: [],
        categories: [],
        popular_angles: [],
        total_analyzed: 0,
      },
      {
        status: 500,
      }
    );
  }
}
