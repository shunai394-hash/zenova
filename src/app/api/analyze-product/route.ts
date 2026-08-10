import { NextRequest, NextResponse } from "next/server";
import {
  analyzeProduct,
  saveProductAnalysis,
  type AnalyzeProductRequest,
  type AnalyzeProductResponse,
} from "@/lib/product-analysis";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeProductRequest;

    const analysis = await analyzeProduct({
      product_name: body.product_name,
      description: body.description,
      target: body.target,
      platform: body.platform,
      product_url: body.product_url ?? null,
      image_name: body.image_name ?? null,
      tiktok_product_id: body.tiktok_product_id ?? null,
      source: body.source,
    });

    let productId: string | null = null;
    let saveWarning: string | null = null;

    try {
      const saved = await saveProductAnalysis({
        product_name: body.product_name,
        description: body.description,
        target: body.target,
        platform: body.platform,
        product_url: body.product_url ?? null,
        image_name: body.image_name ?? null,
        analysis,
      });
      productId = saved.id;
    } catch (saveError) {
      // 分析自体は成功扱い。テーブル未作成時もUIを止めない
      console.error("PRODUCT SAVE ERROR:", saveError);
      saveWarning =
        saveError instanceof Error
          ? saveError.message
          : "商品履歴の保存に失敗しました";
    }

    const response: AnalyzeProductResponse & {
      product_id: string | null;
      save_warning?: string;
    } = {
      analysis,
      product_id: productId,
      ...(saveWarning ? { save_warning: saveWarning } : {}),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("ANALYZE PRODUCT ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 400,
      }
    );
  }
}
