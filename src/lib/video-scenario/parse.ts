import type { SalesVideoScenario } from "./types";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * create-ai-video の body.sales_scenario を正規化。
 * kling_prompt が空なら null（通常の motion prompt 経路）。
 */
export function parseSalesScenarioFromBody(
  raw: unknown
): SalesVideoScenario | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const klingPrompt = asString(obj.kling_prompt);
  if (!klingPrompt) return null;

  return {
    target_customer: asString(obj.target_customer),
    selling_angle: asString(obj.selling_angle),
    hook_0_2sec: asString(obj.hook_0_2sec),
    scene_1: asString(obj.scene_1),
    scene_2: asString(obj.scene_2),
    scene_3: asString(obj.scene_3),
    cta: asString(obj.cta),
    kling_prompt: klingPrompt.slice(0, 2500),
  };
}
