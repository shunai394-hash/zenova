import { NextRequest, NextResponse } from "next/server";
import { listRecentProducts } from "@/lib/product-analysis";

export async function GET(req: NextRequest) {
  try {
    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = Math.min(
      50,
      Math.max(1, Number(limitParam) || 12)
    );

    const products = await listRecentProducts(limit);

    return NextResponse.json({ products });
  } catch (error) {
    console.error("LIST PRODUCTS ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        products: [],
      },
      {
        status: 500,
      }
    );
  }
}
