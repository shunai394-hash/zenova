import Groq from "groq-sdk";
import type { NarrationSceneInput } from "./types";

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

/** Groq 失敗時のフォールバック台本 */
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
  return parts.join("。").replace(/。+/g, "。") + (parts.length ? "。" : "");
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
            "あなたはTikTok販売動画のナレーター台本ライターです。JSONのみ返します。",
        },
        {
          role: "user",
          content: `
商品名: ${asString(input.product_name) || "商品"}

Hook: ${hook}
Scene1: ${s1}
Scene2: ${s2}
Scene3: ${s3}
CTA: ${cta}

15秒前後で読める日本語ナレーション台本を1本作ってください。
- 話し言葉、短文
- Hook→悩み/状況→解決→CTA の流れ
- 120〜220文字程度
- 絵文字・ハッシュタグ・英語禁止

JSONのみ:
{ "script": "" }
`.trim(),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const script = asString(parsed.script);
    if (!script) {
      return buildFallbackNarrationScript(input);
    }
    return script;
  } catch (error) {
    console.error("[voice-narration] script generation fallback:", error);
    return buildFallbackNarrationScript(input);
  }
}
