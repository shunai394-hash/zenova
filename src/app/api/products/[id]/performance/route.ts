import { NextRequest, NextResponse } from "next/server";
import {
  applyPerformanceToSalesScore,
  getPerformanceByProductId,
  getProductById,
  isProductAnalysis,
  upsertProductPerformance,
  type SalesScore,
} from "@/lib/product-analysis";
import { supabase } from "@/lib/supabase";

type Params = {
  params: Promise<{ id: string }>;
};

function restoreBaseScore(score: SalesScore): SalesScore {
  const baseTotal = score.baseTotal ?? score.total;
  const baseBreakdown = score.baseBreakdown ?? score.breakdown;
  return {
    ...score,
    total: baseTotal,
    baseTotal,
    baseBreakdown: { ...baseBreakdown },
    breakdown: { ...baseBreakdown },
    performanceBonus: 0,
    tips: score.tips.filter((tip) => !tip.startsWith("実績ボーナス")),
  };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json(
        { error: "商品が見つかりません" },
        { status: 404 }
      );
    }

    const performance = await getPerformanceByProductId(id);

    let adjusted_score = null;
    if (isProductAnalysis(product.analysis)) {
      const base = restoreBaseScore(product.analysis.salesScore);
      const { score, adjusted } = applyPerformanceToSalesScore(
        base,
        performance
      );
      adjusted_score = { score, meta: adjusted };
    }

    return NextResponse.json({
      performance,
      adjusted_score,
    });
  } catch (error) {
    console.error("GET PERFORMANCE ERROR:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json(
        { error: "商品が見つかりません" },
        { status: 404 }
      );
    }

    const body = await req.json();

    const performance = await upsertProductPerformance({
      product_id: id,
      views: body.views,
      likes: body.likes,
      comments: body.comments,
      clicks: body.clicks,
      sales: body.sales,
      revenue: body.revenue,
      notes: body.notes ?? null,
    });

    let adjusted_score = null;

    if (isProductAnalysis(product.analysis)) {
      const base = restoreBaseScore(product.analysis.salesScore);
      const { score, adjusted } = applyPerformanceToSalesScore(
        base,
        performance
      );

      const nextAnalysis = {
        ...product.analysis,
        salesScore: score,
      };

      const { error: updateError } = await supabase
        .from("products")
        .update({
          analysis: nextAnalysis,
          sales_score: score.total,
          sales_grade: score.grade,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        console.error("PRODUCT SCORE UPDATE ERROR:", updateError);
      }

      adjusted_score = { score, meta: adjusted };
    }

    return NextResponse.json({
      performance,
      adjusted_score,
    });
  } catch (error) {
    console.error("UPSERT PERFORMANCE ERROR:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }
}
