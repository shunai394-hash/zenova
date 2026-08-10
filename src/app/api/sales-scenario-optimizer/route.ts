import { NextRequest, NextResponse } from "next/server";
import {
  optimizeSalesScenario,
  type OptimizeSalesScenarioRequest,
} from "@/lib/video-scenario";

export const runtime = "nodejs";

/**
 * POST /api/sales-scenario-optimizer
 *
 * Kling 投入前の販売シナリオ広告品質チェック＆改善。
 * generate-sales-scenario / create-ai-video / Kling は変更しない。
 */
export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = (await req.json()) as OptimizeSalesScenarioRequest;

    const result = await optimizeSalesScenario({
      product_name: body.product_name,
      description: body.description,
      target_customer: body.target_customer,
      selling_angle: body.selling_angle,
      hook: body.hook,
      scene_1: body.scene_1,
      scene_2: body.scene_2,
      scene_3: body.scene_3,
      cta: body.cta,
    });

    console.log(
      `[sales-scenario-optimizer] ok product=${String(body.product_name ?? "")} ` +
        `score=${result.score} elapsed_ms=${Date.now() - startedAt}`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      `[sales-scenario-optimizer] error elapsed_ms=${Date.now() - startedAt}`,
      error
    );

    const message = error instanceof Error ? error.message : String(error);
    const status =
      message.includes("必須") || message.includes("未設定") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
