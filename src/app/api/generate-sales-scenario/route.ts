import { NextRequest, NextResponse } from "next/server";
import {
  generateSalesScenario,
  type GenerateSalesScenarioRequest,
  type GenerateSalesScenarioResponse,
} from "@/lib/video-scenario";
import { ensureProductRow, saveSalesScenario } from "@/lib/sales-data";

export const runtime = "nodejs";

/**
 * POST /api/generate-sales-scenario
 *
 * 商品情報（＋任意の分析結果）から TikTok 販売動画シナリオ JSON を生成する。
 * create-ai-video / Kling 接続には触れない。
 * 成功時は sales_scenarios へ保存（失敗してもレスポンスは返す）。
 */
export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = (await req.json()) as GenerateSalesScenarioRequest & {
      product_id?: string | null;
    };

    const scenario = await generateSalesScenario({
      product_name: body.product_name,
      description: body.description,
      target: body.target,
      platform: body.platform,
      image_name: body.image_name,
      analysis: body.analysis,
    });

    const platform = (body.platform || "TikTok").trim() || "TikTok";
    const response: GenerateSalesScenarioResponse & {
      product_id?: string | null;
      scenario_id?: string | null;
      save_warning?: string;
    } = {
      ...scenario,
      product_name: String(body.product_name ?? "").trim(),
      platform,
    };

    try {
      const productId = await ensureProductRow({
        product_id: body.product_id,
        product_name: response.product_name,
        description: body.description,
        image_name: body.image_name,
        target: body.target,
        platform,
      });

      const saved = await saveSalesScenario({
        product_id: productId,
        hook: scenario.hook_0_2sec,
        selling_angle: scenario.selling_angle,
        scene_1: scenario.scene_1,
        scene_2: scenario.scene_2,
        scene_3: scenario.scene_3,
        cta: scenario.cta,
        kling_prompt: scenario.kling_prompt,
        target_customer: scenario.target_customer,
      });

      response.product_id = productId;
      response.scenario_id = saved.id;
    } catch (saveError) {
      console.error("[generate-sales-scenario] SAVE ERROR:", saveError);
      response.save_warning =
        saveError instanceof Error
          ? saveError.message
          : "シナリオ保存に失敗しました";
      response.product_id = body.product_id ?? null;
      response.scenario_id = null;
    }

    console.log(
      `[generate-sales-scenario] ok product=${response.product_name} ` +
        `scenario_id=${response.scenario_id ?? "null"} ` +
        `elapsed_ms=${Date.now() - startedAt}`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `[generate-sales-scenario] error elapsed_ms=${Date.now() - startedAt}`,
      error
    );

    const message = error instanceof Error ? error.message : String(error);
    const status =
      message.includes("必須") || message.includes("未設定") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
