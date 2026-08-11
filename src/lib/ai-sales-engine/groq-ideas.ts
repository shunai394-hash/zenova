/**
 * Groq による販売動画企画3案（Server 専用）
 */

import {
  getGroqClient,
  getGroqModel,
  hasGroqApiKey,
  parseGroqJsonObject,
} from "@/lib/groq/client";
import type { ProductAnalysis } from "@/lib/product-analysis";
import { normalizeProductAnalysis } from "@/lib/product-analysis/engine";
import { formatTimelineLines } from "@/lib/analyze/scene-timing";
import type { SalesGoal, SalesVideoIdea } from "./types";
import type { GenerateSalesIdeasInput } from "./ideas";
import { generateSalesVideoIdeasMock } from "./ideas";

const FORBIDDEN_RE =
  /使ってみた|実際に使ったら|正直レビュー|本音レビュー|本当に涼しかった|本当に良かった|口コミで人気|万人が購入|%改善|日使った|効果が確認|知らない人、?損|絶対に|必ず/;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanText(value: unknown): string {
  const s = asString(value);
  if (!s || FORBIDDEN_RE.test(s)) return "";
  // 抽象すぎるフックを落とす
  if (/^(意外な特徴|おすすめ|商品紹介|ポイント)$/.test(s)) return "";
  return s;
}

function sceneList(
  raw: unknown,
  fallback: { scene: string; text: string }[]
): { scene: string; text: string }[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const out: { scene: string; text: string }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const scene = cleanText(row.scene) || "シーン";
    const text = cleanText(row.text);
    if (!text) continue;
    out.push({ scene, text });
  }
  return out.length >= 4 ? out.slice(0, 6) : fallback;
}

function mapIdea(
  raw: Record<string, unknown>,
  defaults: {
    id: string;
    kind: SalesVideoIdea["kind"];
    title: string;
    videoStyle: string;
    goal: SalesGoal;
    targetAudience: string;
    productName: string;
    duration: number;
    fallbackScenes: { scene: string; text: string }[];
    cta: string;
  }
): SalesVideoIdea {
  const hook =
    cleanText(raw.hook) || defaults.fallbackScenes[0]?.text || defaults.productName;
  const timeline = formatTimelineLines(
    sceneList(raw.scenes, defaults.fallbackScenes),
    defaults.duration
  );

  return {
    id: defaults.id,
    kind: defaults.kind,
    title: cleanText(raw.title) || defaults.title,
    target: defaults.targetAudience.slice(0, 16),
    concept: cleanText(raw.concept) || defaults.title,
    targetAudience: defaults.targetAudience,
    whoFor: cleanText(raw.whoFor) || defaults.targetAudience,
    hook,
    problem: cleanText(raw.problem) || "",
    solution: cleanText(raw.solution) || "",
    videoStyle: cleanText(raw.videoStyle) || defaults.videoStyle,
    goal: defaults.goal,
    cta: cleanText(raw.cta) || defaults.cta,
    reason: cleanText(raw.reason) || defaults.title,
    icon: defaults.kind === "pain_solve" ? "💡" : defaults.kind === "viral_intro" ? "🔎" : "⚖️",
    feature: cleanText(raw.feature) || defaults.title,
    suitableProducts: cleanText(raw.suitableProducts) || "",
    timeline,
  };
}

/**
 * Groq で3企画を生成。失敗時は null。
 */
export async function generateSalesVideoIdeasWithGroq(
  input: GenerateSalesIdeasInput
): Promise<SalesVideoIdea[] | null> {
  if (!hasGroqApiKey()) return null;
  if (!input.analysis) return null;

  const analysis = normalizeProductAnalysis(input.analysis);
  const duration = Math.min(60, Math.max(15, input.duration ?? 30));
  const productName =
    input.productName.trim() || analysis.productName || "この商品";
  const targetAudience =
    input.target?.trim() ||
    analysis.target?.trim() ||
    "購入検討者";
  const features = (
    analysis.productFeatures?.length
      ? analysis.productFeatures
      : analysis.sellingPoints || []
  ).slice(0, 4);
  const pains = (analysis.painPoints || []).slice(0, 3);
  const hasReview = Boolean(analysis.hasUserReview);
  const cta = analysis.cta || "プロフィールのリンクから詳細をチェック";

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: getGroqModel("versatile"),
      messages: [
        {
          role: "system",
          content:
            "あなたはTikTok販売動画の企画ディレクターです。JSONのみ返し、実体験の捏造と汎用煽りフックを禁止します。",
        },
        {
          role: "user",
          content: `
商品分析（正本）を理解し、明確に異なる販売戦略の動画企画を3つ作ってください。

商品名: ${productName}
ターゲット（最優先・変更禁止）: ${targetAudience}
特徴: ${features.join(" / ")}
悩み: ${pains.join(" / ")}
販売角度: ${analysis.salesAngle}
推奨フック候補: ${(analysis.recommendedHooks || []).join(" / ")}
CTA: ${cta}
尺: ${duration}秒
hasUserReview: ${hasReview}

【3案の役割】
1. pain_solve 悩み解決型: 悩み→商品→メリット→使用イメージ→CTA
2. viral_intro 発見・おすすめ型: 意外な特徴→紹介→使い道→メリット→CTA
3. review_trust 比較・検証型: 選択の悩み→判断軸→特徴→向いている人→CTA（競合捏造禁止。レビュー未入力なら実体験表現禁止）

【禁止】
- 「これ知らない人、損しています」系の汎用フック
- 使ってみた / 本当に良かった / 口コミで人気 / 人数・％実績の捏造
- ターゲットを主婦などへ勝手変更

各案の hook / scenes.text は商品特徴とターゲットを含む具体文にしてください（例: 「夏の通勤、腕の日差し対策してる？」）。
「意外な特徴」だけの抽象フックは禁止。
各案に scenes を6個（scene, text）。JSONのみ:
{
  "ideas": [
    {
      "kind": "pain_solve",
      "title": "悩み解決型",
      "hook": "",
      "problem": "",
      "solution": "",
      "whoFor": "",
      "reason": "",
      "feature": "",
      "videoStyle": "ugc",
      "cta": "",
      "scenes": [{"scene":"","text":""}]
    }
  ]
}
`.trim(),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.55,
    });

    const parsed = parseGroqJsonObject(
      completion.choices[0]?.message?.content || "{}"
    );
    const rows = Array.isArray(parsed.ideas) ? parsed.ideas : [];
    if (rows.length < 3) return null;

    const fallback = generateSalesVideoIdeasMock(input);

    const ideas: SalesVideoIdea[] = [0, 1, 2].map((i) => {
      const raw = (rows[i] && typeof rows[i] === "object"
        ? rows[i]
        : {}) as Record<string, unknown>;
      const base = fallback[i]!;
      return mapIdea(raw, {
        id: base.id,
        kind: base.kind,
        title: base.title,
        videoStyle: base.videoStyle,
        goal: base.goal,
        targetAudience,
        productName,
        duration,
        fallbackScenes: base.timeline.map((t) => ({
          scene: t.scene,
          text: t.text,
        })),
        cta,
      });
    });

    // ターゲット強制・捏造掃除
    return ideas.map((idea) => ({
      ...idea,
      targetAudience,
      target: targetAudience.slice(0, 16),
      hook: FORBIDDEN_RE.test(idea.hook) ? (analysis.recommendedHooks?.[0] || idea.hook) : idea.hook,
    }));
  } catch (error) {
    console.error("[ai-sales-engine] Groq ideas failed:", error);
    return null;
  }
}

/**
 * Groq → fallback の一本入口（Server 向け）
 */
export async function generateSalesVideoIdeasAsync(
  input: GenerateSalesIdeasInput
): Promise<{ ideas: SalesVideoIdea[]; ideasMode: "groq" | "fallback" }> {
  const groqIdeas = await generateSalesVideoIdeasWithGroq(input);
  if (groqIdeas && groqIdeas.length >= 3) {
    return { ideas: groqIdeas.slice(0, 3), ideasMode: "groq" };
  }
  return {
    ideas: generateSalesVideoIdeasMock(input).slice(0, 3),
    ideasMode: "fallback",
  };
}
