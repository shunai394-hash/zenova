import { NextRequest, NextResponse } from "next/server";
import {
  analyzeVideoPerformance,
  type AnalyzeVideoPerformanceRequest,
} from "@/lib/video-performance";
import { ensureProductRow, saveGeneratedVideo } from "@/lib/sales-data";

export const runtime = "nodejs";

/**
 * POST /api/video-performance-analyzer
 *
 * 販売動画の企画・台本をAI評価し、スコアと改善点を返す。
 * 評価完了後に generated_videos へ保存（失敗しても評価結果は返す）。
 */
export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = (await req.json()) as AnalyzeVideoPerformanceRequest & {
      product_id?: string | null;
      audio_url?: string | null;
      scenario_id?: string | null;
    };

    const result = await analyzeVideoPerformance({
      product_name: body.product_name,
      selling_angle: body.selling_angle,
      hook: body.hook,
      scenes: body.scenes,
      cta: body.cta,
      video_url: body.video_url,
      narration_script: body.narration_script,
    });

    let productId: string | null = body.product_id ?? null;
    let generatedVideoId: string | null = null;
    let saveWarning: string | undefined;

    try {
      productId = await ensureProductRow({
        product_id: body.product_id,
        product_name: String(body.product_name ?? ""),
        description: "",
        platform: "TikTok",
      });

      const saved = await saveGeneratedVideo({
        product_id: productId,
        video_url: String(body.video_url ?? ""),
        audio_url: body.audio_url ?? null,
        score: result.overall_score,
        hook_score: result.hook_score,
        product_score: result.product_score,
        cta_score: result.cta_score,
        tiktok_score: result.tiktok_score,
        scenario_id: body.scenario_id ?? null,
        narration_script: body.narration_script ?? null,
      });
      generatedVideoId = saved.id;
    } catch (saveError) {
      console.error("[video-performance-analyzer] SAVE ERROR:", saveError);
      saveWarning =
        saveError instanceof Error
          ? saveError.message
          : "生成動画の保存に失敗しました";
    }

    console.log(
      `[video-performance-analyzer] ok product=${String(body.product_name ?? "")} ` +
        `overall=${result.overall_score} generated_video_id=${generatedVideoId ?? "null"} ` +
        `elapsed_ms=${Date.now() - startedAt}`
    );

    return NextResponse.json({
      ...result,
      product_id: productId,
      generated_video_id: generatedVideoId,
      ...(saveWarning ? { save_warning: saveWarning } : {}),
      elapsed_ms: Date.now() - startedAt,
    });
  } catch (error) {
    console.error(
      `[video-performance-analyzer] error elapsed_ms=${Date.now() - startedAt}`,
      error
    );

    const message = error instanceof Error ? error.message : String(error);
    const status =
      message.includes("必須") || message.includes("未設定") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
