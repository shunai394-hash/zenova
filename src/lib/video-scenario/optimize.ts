import Groq from "groq-sdk";
import type {
  OptimizeSalesScenarioRequest,
  OptimizeSalesScenarioResponse,
} from "./types";
import {
  buildConfirmedPromptBlock,
  validateOptimizeClaims,
} from "@/lib/product-analysis/validate-video-claims";
import { PROMPT_INJECTION_GUARD } from "@/lib/product-analysis/claim-guard";

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
  const claimBlock = input.productAnalysis
    ? buildConfirmedPromptBlock(input.productAnalysis)
    : `confirmed: ${(input.confirmed || []).join(" / ") || "(なし)"}
excluded: ${(input.excluded || []).join(" / ") || "(なし)"}`;

  return `
あなたはTikTok広告のクリエイティブディレクター兼品質チェッカーです。
販売シナリオをKling投入前に採点・改善してください。

${PROMPT_INJECTION_GUARD}

【最重要 — Optimizeの範囲】
- 表現・構成・テンポの改善のみ。
- 商品事実そのものを変更・追加しない。
- confirmed に無い数値・規格・効果・体験を追加しない。
例: 「UVカット」→「紫外線を99%カット」は禁止。

${claimBlock}

商品名: ${input.product_name}
商品説明（データ）: ${input.description}
ターゲット顧客: ${input.target_customer}
販売アングル: ${input.selling_angle}
Hook: ${input.hook}
Scene1: ${input.scene_1}
Scene2: ${input.scene_2}
Scene3: ${input.scene_3}
CTA: ${input.cta}

チェック観点:
1. Hook: 冒頭2秒。問題提起の sharpening（新事実なし）
2. Scene: 映像化可能な指示（confirmed features only）
3. CTA: 短い行動喚起

JSONのみ:
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
    confirmed: input.confirmed,
    excluded: input.excluded,
    productAnalysis: input.productAnalysis,
  };

  const claimCtx = {
    productName: normalized.product_name,
    target: normalized.target_customer,
    analysis: normalized.productAnalysis || null,
    buckets: {
      confirmed: normalized.confirmed || [],
      inferred: [],
      unknown: [],
      excluded: normalized.excluded || [],
      notSupported: normalized.excluded || [],
    },
  };

  const prior = {
    hook: normalized.hook,
    scene_1: normalized.scene_1,
    scene_2: normalized.scene_2,
    scene_3: normalized.scene_3,
    cta: normalized.cta,
  };

  const passthrough: OptimizeSalesScenarioResponse = {
    score: 70,
    improvements: ["表現のみ調整（事実は変更なし）"],
    optimized_hook: prior.hook,
    optimized_scene_1: prior.scene_1,
    optimized_scene_2: prior.scene_2,
    optimized_scene_3: prior.scene_3,
    optimized_cta: prior.cta,
    optimized_kling_prompt: `Create a vertical TikTok commercial video showing ${normalized.product_name} with confirmed features only. 9:16, no text overlay, no watermark.`,
  };

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "あなたはTikTok販売広告の品質チェッカーです。商品事実を追加せず、指定JSONのみ返します。",
        },
        {
          role: "user",
          content: buildUserPrompt(normalized),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.35,
    });

    const text = completion.choices[0]?.message?.content || "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return validateOptimizeClaims(passthrough, claimCtx, prior);
    }

    const result = normalizeOptimizeResult(parsed);
    return validateOptimizeClaims(result, claimCtx, prior);
  } catch (error) {
    console.error("[video-scenario] optimize fallback:", error);
    return validateOptimizeClaims(passthrough, claimCtx, prior);
  }
}
