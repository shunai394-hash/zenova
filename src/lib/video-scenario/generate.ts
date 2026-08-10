import Groq from "groq-sdk";
import type {
  GenerateSalesScenarioRequest,
  SalesVideoScenario,
} from "./types";

const SCENARIO_KEYS = [
  "target_customer",
  "selling_angle",
  "hook_0_2sec",
  "scene_1",
  "scene_2",
  "scene_3",
  "cta",
  "kling_prompt",
] as const;

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

export function normalizeSalesScenario(
  raw: Record<string, unknown>
): SalesVideoScenario {
  const scenario: SalesVideoScenario = {
    target_customer: asString(raw.target_customer),
    selling_angle: asString(raw.selling_angle),
    hook_0_2sec: asString(raw.hook_0_2sec),
    scene_1: asString(raw.scene_1),
    scene_2: asString(raw.scene_2),
    scene_3: asString(raw.scene_3),
    cta: asString(raw.cta),
    kling_prompt: asString(raw.kling_prompt),
  };

  const missing = SCENARIO_KEYS.filter((key) => !scenario[key]);
  if (missing.length > 0) {
    throw new Error(
      `販売シナリオの必須フィールドが不足しています: ${missing.join(", ")}`
    );
  }

  return scenario;
}

function buildUserPrompt(input: GenerateSalesScenarioRequest): string {
  const platform = (input.platform || "TikTok").trim() || "TikTok";
  const analysis = input.analysis;

  const analysisBlock = analysis
    ? `
【商品分析結果】
要約: ${analysis.summary ?? ""}
販売アングル: ${analysis.salesAngle ?? ""}
強み: ${(analysis.sellingPoints ?? []).join(" / ")}
悩み: ${(analysis.painPoints ?? []).join(" / ")}
ターゲット洞察: ${analysis.targetInsight ?? ""}
推奨CTA: ${analysis.cta ?? ""}
推奨構成: ${(analysis.recommendedVideoStructure ?? []).join(" → ")}
`
    : "";

  return `
あなたはTikTokアフィリエイト／物販の動画ディレクターです。
「商品が動くだけ」ではなく、視聴者が欲しくなる販売用ショート動画のシナリオを作ってください。

商品名:
${input.product_name}

商品説明:
${input.description}

ターゲット:
${input.target}

プラットフォーム:
${platform}

商品画像:
${input.image_name?.trim() || "（画像あり・商品ビジュアルを活かす）"}
${analysisBlock}

要件:
- 0〜2秒でスクロールを止めるフック
- 悩み → 解決 → 商品証明 → CTA の流れ
- scene_1〜3 は映像で撮れる具体的な指示（誰が何をしているか）
- kling_prompt は英語のみ。必ず "Create a vertical TikTok commercial video showing..." で始め、hook/scenes/CTA を映像指示としてつなぐ（約15秒、9:16、no text overlay, no watermark）
- 日本語フィールドは自然な話し言葉、短く鋭く（hook は0-2秒で刺さる一言）

JSONのみで返してください（他の文字は不要）:
{
  "target_customer": "",
  "selling_angle": "",
  "hook_0_2sec": "",
  "scene_1": "",
  "scene_2": "",
  "scene_3": "",
  "cta": "",
  "kling_prompt": ""
}
`.trim();
}

export async function generateSalesScenario(
  input: GenerateSalesScenarioRequest
): Promise<SalesVideoScenario> {
  const productName = input.product_name?.trim();
  const description = input.description?.trim();
  const target = input.target?.trim();

  if (!productName) throw new Error("product_name は必須です");
  if (!description) throw new Error("description は必須です");
  if (!target) throw new Error("target は必須です");

  const groq = getGroqClient();

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "あなたはTikTok販売動画のシナリオライターです。必ず指定のJSONスキーマのみを返します。",
      },
      {
        role: "user",
        content: buildUserPrompt({
          ...input,
          product_name: productName,
          description,
          target,
        }),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content || "{}";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`シナリオJSONのパースに失敗しました: ${text.slice(0, 200)}`);
  }

  return normalizeSalesScenario(parsed);
}
