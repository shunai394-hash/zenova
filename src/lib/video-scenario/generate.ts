import Groq from "groq-sdk";
import type {
  GenerateSalesScenarioRequest,
  SalesVideoScenario,
} from "./types";
import {
  buildConfirmedPromptBlock,
  buildFallbackScenarioFromConfirmed,
  validateSalesScenarioClaims,
} from "@/lib/product-analysis/validate-video-claims";
import { PROMPT_INJECTION_GUARD, wrapUserDataForPrompt } from "@/lib/product-analysis/claim-guard";

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
  const confirmed =
    analysis?.confirmed?.length
      ? analysis.confirmed
      : analysis?.sellingPoints || [];

  const claimBlock = analysis?.productAnalysis
    ? buildConfirmedPromptBlock(analysis.productAnalysis)
    : `confirmed（商品事実の唯一の正本）: ${confirmed.join(" / ") || "(なし)"}
excluded: ${(analysis?.excluded || []).join(" / ") || "(なし)"}
unknown: 埋めない
inferred: 商品スペックとして使わない`;

  return `
あなたはTikTokアフィリエイト／物販の動画ディレクターです。
販売用ショート動画のシナリオを作ってください。

${PROMPT_INJECTION_GUARD}

【商品事実ルール — 最重要】
- 商品について記述できる事実は confirmed のみ。
- unknown / excluded は使わない・肯定しない。
- inferred をスペック・効果・性能として書かない。
- 数値（%・UPF・g 等）、成分、効果断定、使用体験、レビューの追加禁止。
- 表現を変えても confirmed に無い情報は追加しない。
例: confirmed「UVカット」→ OK「UVカット」。NG「UV99%」「UPF50+」「通気性が高い」。

${claimBlock}

${wrapUserDataForPrompt("product_name", input.product_name)}
${wrapUserDataForPrompt("description_data_only", input.description)}
${wrapUserDataForPrompt("target", input.target)}
プラットフォーム: ${platform}
商品画像: ${input.image_name?.trim() || "（あり）"}

要件:
- 0〜2秒フック
- 悩み → 解決 → 商品証明 → CTA（証明は confirmed のみ）
- scene_1〜3 は映像指示（confirmed 外の機能を書かない）
- kling_prompt は英語のみ。"Create a vertical TikTok commercial video showing..." で始め、confirmed features only（約15秒、9:16、no text overlay, no watermark）

JSONのみ:
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

  const claimCtx = {
    productName,
    target,
    analysis: input.analysis?.productAnalysis || null,
    buckets: {
      confirmed:
        input.analysis?.confirmed ||
        input.analysis?.sellingPoints ||
        [],
      inferred: [],
      unknown: [],
      excluded: input.analysis?.excluded || [],
      notSupported: input.analysis?.excluded || [],
    },
  };

  const fallback = buildFallbackScenarioFromConfirmed({
    productName,
    target,
    confirmed: claimCtx.buckets.confirmed,
    cta: input.analysis?.cta,
  });

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "あなたはTikTok販売動画のシナリオライターです。confirmed以外の商品事実を作らず、指定JSONのみ返します。",
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
      temperature: 0.4,
    });

    const text = completion.choices[0]?.message?.content || "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return validateSalesScenarioClaims(fallback, claimCtx);
    }

    const normalized = normalizeSalesScenario(parsed);
    return validateSalesScenarioClaims(normalized, claimCtx);
  } catch (error) {
    console.error("[video-scenario] generate fallback:", error);
    return validateSalesScenarioClaims(fallback, claimCtx);
  }
}
