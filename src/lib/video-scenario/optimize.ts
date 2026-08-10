import Groq from "groq-sdk";
import type {
  OptimizeSalesScenarioRequest,
  OptimizeSalesScenarioResponse,
} from "./types";

function getGroqClient(): Groq {
  const apiKey =
    process.env.GROQ_API_KEY?.trim() ||
    process.env.Groq_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GROQ_API_KEY が未設定です");
  }

  return new Groq({ apiKey });
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function asImprovements(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter((item) => item.length > 0)
    .slice(0, 12);
}

export function normalizeOptimizeResult(
  raw: Record<string, unknown>
): OptimizeSalesScenarioResponse {
  const result: OptimizeSalesScenarioResponse = {
    score: asScore(raw.score),
    improvements: asImprovements(raw.improvements),
    optimized_hook: asString(raw.optimized_hook),
    optimized_scene_1: asString(raw.optimized_scene_1),
    optimized_scene_2: asString(raw.optimized_scene_2),
    optimized_scene_3: asString(raw.optimized_scene_3),
    optimized_cta: asString(raw.optimized_cta),
    optimized_kling_prompt: asString(raw.optimized_kling_prompt),
  };

  const required: Array<keyof OptimizeSalesScenarioResponse> = [
    "optimized_hook",
    "optimized_scene_1",
    "optimized_scene_2",
    "optimized_scene_3",
    "optimized_cta",
    "optimized_kling_prompt",
  ];
  const missing = required.filter((key) => !result[key]);
  if (missing.length > 0) {
    throw new Error(
      `最適化結果の必須フィールドが不足しています: ${missing.join(", ")}`
    );
  }

  return result;
}

function requireField(label: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} は必須です`);
  return trimmed;
}

function buildUserPrompt(input: OptimizeSalesScenarioRequest): string {
  return `
あなたはTikTok広告のクリエイティブディレクター兼品質チェッカーです。
販売シナリオをKling（image-to-video）に送る前に、広告品質を採点・改善してください。

商品名:
${input.product_name}

商品説明:
${input.description}

ターゲット顧客:
${input.target_customer}

販売アングル:
${input.selling_angle}

Hook（0-2秒）:
${input.hook}

Scene1:
${input.scene_1}

Scene2:
${input.scene_2}

Scene3:
${input.scene_3}

CTA:
${input.cta}

チェック観点:
1. Hook: 冒頭2秒でスクロールを止められるか。問題提起が弱い場合は改善。
2. Selling angle: 商品スペック列挙ではなく「買う理由」になっているか（必要なら improvements に指摘）。
3. Scene: 各シーンが映像化可能か。商品だけの静止画寄りにならないよう、人物・状況・動作を入れる。
4. CTA: 購入・クリックにつながる短い行動喚起へ改善。

出力ルール:
- score は 0〜100 の整数（改善後の想定品質）
- improvements は具体的な改善点の配列（日本語、3〜8件目安）
- optimized_* は改善後の最終文言（日本語。kling_prompt のみ英語）
- optimized_kling_prompt は必ず "Create a vertical TikTok commercial video showing..." で始め、optimized hook/scenes/CTA を反映（約15秒、9:16、no text overlay, no watermark）

JSONのみで返してください:
{
  "score": 0,
  "improvements": [],
  "optimized_hook": "",
  "optimized_scene_1": "",
  "optimized_scene_2": "",
  "optimized_scene_3": "",
  "optimized_cta": "",
  "optimized_kling_prompt": ""
}
`.trim();
}

export async function optimizeSalesScenario(
  input: OptimizeSalesScenarioRequest
): Promise<OptimizeSalesScenarioResponse> {
  const normalized: OptimizeSalesScenarioRequest = {
    product_name: requireField("product_name", input.product_name ?? ""),
    description: requireField("description", input.description ?? ""),
    target_customer: requireField(
      "target_customer",
      input.target_customer ?? ""
    ),
    selling_angle: requireField("selling_angle", input.selling_angle ?? ""),
    hook: requireField("hook", input.hook ?? ""),
    scene_1: requireField("scene_1", input.scene_1 ?? ""),
    scene_2: requireField("scene_2", input.scene_2 ?? ""),
    scene_3: requireField("scene_3", input.scene_3 ?? ""),
    cta: requireField("cta", input.cta ?? ""),
  };

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "あなたはTikTok販売広告の品質チェッカーです。必ず指定のJSONスキーマのみを返します。",
      },
      {
        role: "user",
        content: buildUserPrompt(normalized),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  const text = completion.choices[0]?.message?.content || "{}";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `最適化JSONのパースに失敗しました: ${text.slice(0, 200)}`
    );
  }

  return normalizeOptimizeResult(parsed);
}
