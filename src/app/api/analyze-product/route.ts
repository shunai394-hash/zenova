import { NextRequest, NextResponse } from "next/server";
import {
  analyzeProduct,
  saveProductAnalysis,
  type AnalyzeProductRequest,
  type AnalyzeProductResponse,
} from "@/lib/product-analysis";
import { generateSalesVideoIdeasAsync } from "@/lib/ai-sales-engine";
import {
  generateVideoIdeas,
  type VideoIdea,
} from "@/lib/video-pipeline";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeProductRequest & {
      duration_sec?: number;
    };

    const analysis = await analyzeProduct({
      product_name: body.product_name,
      description: body.description,
      target: body.target,
      platform: body.platform,
      product_url: body.product_url ?? null,
      image_name: body.image_name ?? null,
      tiktok_product_id: body.tiktok_product_id ?? null,
      source: body.source,
      review_text: body.review_text ?? null,
    });

    const duration = Math.min(
      60,
      Math.max(15, Number(body.duration_sec) || 30)
    );

    let videoIdeas: VideoIdea[] = [];
    let ideasMode: "groq" | "fallback" = "fallback";

    try {
      const generated = await generateSalesVideoIdeasAsync({
        productName: body.product_name,
        description: body.description,
        target: body.target,
        analysis,
        duration,
      });
      ideasMode = generated.ideasMode;
      videoIdeas = generated.ideas.map((idea) => ({
        id: idea.id,
        title: idea.title,
        concept: idea.concept,
        targetAudience: idea.targetAudience,
        hook: idea.hook,
        videoStyle: idea.videoStyle,
        timeline: idea.timeline,
        cta: idea.cta,
        reason: idea.reason,
        icon: idea.icon,
        feature: idea.feature,
        suitableProducts: idea.suitableProducts,
        whoFor: idea.whoFor,
        goal: idea.goal,
        target: idea.target,
        problem: idea.problem,
        solution: idea.solution,
      }));
    } catch (ideasError) {
      console.error("SALES IDEAS ERROR:", ideasError);
      videoIdeas = generateVideoIdeas(
        {
          productName: body.product_name,
          description: body.description,
          targetAudience: body.target,
          analysis,
          sellingPoints: analysis.productFeatures || analysis.sellingPoints,
        },
        { duration }
      );
      ideasMode = "fallback";
    }

    let productId: string | null = null;
    let saveWarning: string | null = null;

    try {
      const saved = await saveProductAnalysis({
        product_name: body.product_name,
        description: body.description ?? "",
        target: body.target,
        platform: body.platform,
        product_url: body.product_url ?? null,
        image_name: body.image_name ?? null,
        analysis,
      });
      productId = saved.id;
    } catch (saveError) {
      console.error("PRODUCT SAVE ERROR:", saveError);
      saveWarning =
        saveError instanceof Error
          ? saveError.message
          : "商品履歴の保存に失敗しました";
    }

    const response: AnalyzeProductResponse & {
      product_id: string | null;
      save_warning?: string;
      video_ideas?: VideoIdea[];
      ideas_mode?: "groq" | "fallback";
      analysis_mode?: "groq" | "fallback";
    } = {
      analysis,
      product_id: productId,
      video_ideas: videoIdeas,
      ideas_mode: ideasMode,
      analysis_mode: analysis.analysisMode || "fallback",
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
