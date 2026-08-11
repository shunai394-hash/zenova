import Groq from "groq-sdk";
import type { NarrationSceneInput } from "./types";
import {
  validateNarrationScript,
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

function claimCtxFromInput(input: NarrationSceneInput) {
  return {
    productName: asString(input.product_name) || "商品",
    target: "",
    analysis: input.productAnalysis || null,
    buckets: {
      confirmed: input.confirmed || [],
      inferred: [],
      unknown: [],
      excluded: input.excluded || [],
      notSupported: input.excluded || [],
    },
  };
}

/** Groq 失敗時のフォールバック台本（事後ゲート必須） */
export function buildFallbackNarrationScript(
  input: NarrationSceneInput
): string {
  const parts = [
    asString(input.optimized_hook),
    asString(input.optimized_scene_1),
    asString(input.optimized_scene_2),
    asString(input.optimized_scene_3),
    asString(input.optimized_cta),
  ].filter(Boolean);
  const raw =
    parts.join("。").replace(/。+/g, "。") + (parts.length ? "。" : "");
  return validateNarrationScript(raw, claimCtxFromInput(input));
}

/**
 * 販売動画用の短い日本語ナレーション台本を生成（約12〜18秒想定）
 */
export async function generateNarrationScript(
  input: NarrationSceneInput
): Promise<string> {
  const hook = asString(input.optimized_hook);
  const s1 = asString(input.optimized_scene_1);
  const s2 = asString(input.optimized_scene_2);
  const s3 = asString(input.optimized_scene_3);
  const cta = asString(input.optimized_cta);
  const ctx = claimCtxFromInput(input);

  if (!hook || !s1 || !s2 || !s3 || !cta) {
    throw new Error(
      "optimized_hook / optimized_scene_1-3 / optimized_cta は必須です"
    );
  }

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "あなたはTikTok販売動画のナレーター台本ライターです。confirmed以外の商品事実を作らず、JSONのみ返します。",
        },
        {
          role: "user",
          content: `
${PROMPT_INJECTION_GUARD}

商品名: ${asString(input.product_name) || "商品"}
confirmed（使える商品事実）: ${(input.confirmed || []).join(" / ") || "(なし)"}
excluded（肯定禁止）: ${(input.excluded || []).join(" / ") || "(なし)"}

Hook: ${hook}
Scene1: ${s1}
Scene2: ${s2}
Scene3: ${s3}
CTA: ${cta}

15秒前後で読める日本語ナレーションを1本。
- 話し言葉、短文
- Hook→状況→特徴（confirmedのみ）→CTA
- 効果断定・数値追加・使用体験・レビュー捏造禁止
- 「使ってみた」「してみた」禁止
- 120〜220文字、絵文字・ハッシュタグ禁止

JSONのみ:
{ "script": "" }
`.trim(),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.35,
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const script = asString(parsed.script);
    if (!script) {
      return buildFallbackNarrationScript(input);
    }
    return validateNarrationScript(script, ctx);
  } catch (error) {
    console.error("[voice-narration] script generation fallback:", error);
    return buildFallbackNarrationScript(input);
  }
}
