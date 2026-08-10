import Groq from "groq-sdk";
import type {
  AnalyzeVideoPerformanceRequest,
  AnalyzeVideoPerformanceResponse,
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

function asStringList(value: unknown, limit = 10): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeScenes(scenes: string[] | string | undefined): string[] {
  if (Array.isArray(scenes)) {
    return scenes.map((s) => asString(s)).filter(Boolean);
  }
  if (typeof scenes === "string" && scenes.trim()) {
    return scenes
      .split(/\n|→|->|\|/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function requireField(label: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} は必須です`);
  return trimmed;
}

export function normalizePerformanceResult(
  raw: Record<string, unknown>
): AnalyzeVideoPerformanceResponse {
  const hook = asScore(raw.hook_score);
  const product = asScore(raw.product_score);
  const cta = asScore(raw.cta_score);
  const tiktok = asScore(raw.tiktok_score);
  let overall = asScore(raw.overall_score);
  if (!raw.overall_score && (hook || product || cta || tiktok)) {
    overall = Math.round((hook + product + cta + tiktok) / 4);
  }

  const result: AnalyzeVideoPerformanceResponse = {
    overall_score: overall,
    hook_score: hook,
    product_score: product,
    cta_score: cta,
    tiktok_score: tiktok,
    strengths: asStringList(raw.strengths, 8),
    improvements: asStringList(raw.improvements, 10),
    next_action_prompt: asString(raw.next_action_prompt),
  };

  if (!result.next_action_prompt) {
    result.next_action_prompt =
      result.improvements[0] ||
      "HookとCTAを強化して動画を再生成してください";
  }

  return result;
}

function buildUserPrompt(input: {
  product_name: string;
  selling_angle: string;
  hook: string;
  scenes: string[];
  cta: string;
  video_url: string | null;
  narration_script: string | null;
}): string {
  return `
あなたはTikTok販売動画のパフォーマンスアナリストです。
実際の映像ファイルは見られない前提で、企画・台本・構成テキストから広告品質を採点してください。

商品名:
${input.product_name}

販売アングル:
${input.selling_angle}

Hook:
${input.hook}

Scenes:
${input.scenes.map((s, i) => `${i + 1}. ${s}`).join("\n") || "(なし)"}

CTA:
${input.cta}

ナレーション台本:
${input.narration_script || "(なし)"}

video_url:
${input.video_url || "(なし)"}

評価観点:
1. Hook評価 (hook_score): 最初2秒で興味を引けるか / 問題提起が明確か
2. 商品理解評価 (product_score): 何の商品かわかるか / メリットが伝わるか
3. 購入意欲評価 (cta_score): 購入理由があるか / CTAが弱くないか
4. TikTok適性評価 (tiktok_score): 短尺向きか / 視聴維持できる構成か
5. overall_score: 上記を総合した 0-100

出力ルール:
- 各 score は 0〜100 の整数
- strengths / improvements は具体的な日本語（各3〜6件目安）
- next_action_prompt は次に直すべき最優先アクションを1文で

JSONのみ:
{
  "overall_score": 0,
  "hook_score": 0,
  "product_score": 0,
  "cta_score": 0,
  "tiktok_score": 0,
  "strengths": [],
  "improvements": [],
  "next_action_prompt": ""
}
`.trim();
}

export async function analyzeVideoPerformance(
  input: AnalyzeVideoPerformanceRequest
): Promise<AnalyzeVideoPerformanceResponse> {
  const productName = requireField(
    "product_name",
    asString(input.product_name)
  );
  const sellingAngle = requireField(
    "selling_angle",
    asString(input.selling_angle)
  );
  const hook = requireField("hook", asString(input.hook));
  const cta = requireField("cta", asString(input.cta));
  const scenes = normalizeScenes(input.scenes);
  if (scenes.length === 0) {
    throw new Error("scenes は必須です（1件以上）");
  }

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "あなたはTikTok販売動画の評価AIです。必ず指定のJSONスキーマのみを返します。",
      },
      {
        role: "user",
        content: buildUserPrompt({
          product_name: productName,
          selling_angle: sellingAngle,
          hook,
          scenes,
          cta,
          video_url: asString(input.video_url ?? "") || null,
          narration_script: asString(input.narration_script ?? "") || null,
        }),
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
    throw new Error(`評価JSONのパースに失敗しました: ${text.slice(0, 200)}`);
  }

  return normalizePerformanceResult(parsed);
}
