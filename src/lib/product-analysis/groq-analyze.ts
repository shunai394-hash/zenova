/**
 * Groq による ProductAnalysis 生成（Server 専用）
 * 既存 video-scenario と同じ llama-3.3-70b-versatile + json_object パターン。
 */

import {
  getGroqClient,
  getGroqModel,
  hasGroqApiKey,
  parseGroqJsonObject,
} from "@/lib/groq/client";
import type {
  AnalyzeProductRequest,
  BuyerPersonaDetail,
  ProductAnalysis,
  SalesScore,
  SalesScoreBreakdown,
  TikTokProductSnapshot,
} from "./types";
import {
  extractProductFeatures,
  normalizeProductAnalysis,
} from "./engine";

const FORBIDDEN_REVIEW_RE =
  /使ってみた|実際に使ったら|正直レビュー|本音レビュー|本当に涼しかった|本当に良かった|口コミで人気|万人が購入|%改善|日使った|効果が確認|絶対に|必ず|知らない人、?損/;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown, limit = 8): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const s = asString(item);
    if (!s || FORBIDDEN_REVIEW_RE.test(s)) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function gradeFromTotal(total: number): SalesScore["grade"] {
  if (total >= 90) return "S";
  if (total >= 80) return "A";
  if (total >= 65) return "B";
  if (total >= 50) return "C";
  return "D";
}

function buildPrompt(input: {
  productName: string;
  description: string;
  target: string;
  platform: string;
  productUrl: string;
  imageName: string | null;
  reviewText: string;
  hasUserReview: boolean;
  heuristicFeatures: string[];
}): string {
  return `
あなたはEC・ショート動画向けの商品アナリストです。
入力された商品情報だけを根拠に、販売用の構造化分析JSONを作ってください。

【絶対ルール】
1. 入力ターゲット「${input.target}」を最優先。矛盾するペルソナ（例: 入力が会社員なのに主婦）は禁止。具体化は入力の範囲内のみ。
2. 商品説明・商品名に無い機能・効果・数値・実績を事実として書かない。
3. 実体験レビュー未入力（hasUserReview=${input.hasUserReview}）のとき、「使ってみた」「本当に涼しかった」「口コミで人気」「○万人」「○%改善」等の捏造禁止。
4. factualClaims と inferredClaims を必ず分離。inferred には「AI推定」ニュアンスを含めてよい。
5. 商品名全文を sellingPoints にしない。特徴は短い単位に分解。
6. フックは商品固有。汎用「損しています」禁止。
7. スコアは参考値（実測データなし）。scoreKind は "estimated"。
8. JSONのみ返す。

【入力】
商品名: ${input.productName}
商品説明: ${input.description || "(未入力・商品名から判断)"}
ターゲット: ${input.target}
プラットフォーム: ${input.platform}
商品URL: ${input.productUrl || "(なし)"}
画像: ${input.imageName || "(なし)"}
レビュー本文: ${input.hasUserReview ? input.reviewText : "(なし)"}
ヒューリスティック特徴候補: ${input.heuristicFeatures.join(" / ") || "(なし)"}

【出力JSONスキーマ】
{
  "category": "",
  "productFeatures": [],
  "sellingPoints": [],
  "customerBenefits": [],
  "target": "${input.target}",
  "buyerPersonaDetail": {
    "name": "",
    "age": "",
    "occupation": "",
    "lifestyle": "",
    "pain": ""
  },
  "buyerPersona": "",
  "painPoints": [],
  "purchaseReasons": [],
  "objections": [],
  "differentiation": [],
  "salesAngle": "",
  "recommendedAngles": [],
  "recommendedVideoStructure": [],
  "recommendedHooks": [],
  "cta": "",
  "ctaIdeas": [],
  "offerStyle": "",
  "targetInsight": "",
  "summary": "",
  "factualClaims": [],
  "inferredClaims": [],
  "uncertainty": [],
  "complianceNotes": [],
  "salesScore": {
    "total": 0,
    "grade": "B",
    "label": "",
    "breakdown": {
      "clarity": 0,
      "demandFit": 0,
      "differentiation": 0,
      "creativePotential": 0,
      "conversionReadiness": 0
    },
    "tips": [],
    "scoreKind": "estimated",
    "scoreNote": "AI推定・参考スコア（実測販売データなし）"
  }
}
`.trim();
}

function mapSalesScore(raw: unknown): SalesScore {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const b = (obj.breakdown && typeof obj.breakdown === "object"
    ? obj.breakdown
    : {}) as Record<string, unknown>;
  const breakdown: SalesScoreBreakdown = {
    clarity: clampScore(Number(b.clarity) || 60),
    demandFit: clampScore(Number(b.demandFit) || 60),
    differentiation: clampScore(Number(b.differentiation) || 55),
    creativePotential: clampScore(Number(b.creativePotential) || 60),
    conversionReadiness: clampScore(Number(b.conversionReadiness) || 55),
  };
  const total = clampScore(
    Number(obj.total) ||
      (breakdown.clarity +
        breakdown.demandFit +
        breakdown.differentiation +
        breakdown.creativePotential +
        breakdown.conversionReadiness) /
        5
  );
  const grade =
    obj.grade === "S" ||
    obj.grade === "A" ||
    obj.grade === "B" ||
    obj.grade === "C" ||
    obj.grade === "D"
      ? obj.grade
      : gradeFromTotal(total);

  return {
    total,
    grade,
    label: asString(obj.label) || "動画化しやすい（推定）",
    breakdown,
    tips: asStringArray(obj.tips, 4),
    baseTotal: total,
    baseBreakdown: { ...breakdown },
    performanceBonus: 0,
    scoreKind: "estimated",
    scoreNote:
      asString(obj.scoreNote) ||
      "AI推定・参考スコア（実測販売データなし）",
  };
}

function enforceTargetPersona(
  target: string,
  detail: BuyerPersonaDetail | undefined,
  pain: string
): BuyerPersonaDetail {
  const ageMatch = target.match(/(\d{2})\s*代/) || target.match(/(\d{2})\s*歳/);
  const ageNum = ageMatch ? Number(ageMatch[1]) : null;
  const age =
    ageNum != null
      ? /\d{2}代/.test(target)
        ? `${ageNum + 4}歳前後（${ageNum}代）`
        : `${ageNum}歳`
      : asString(detail?.age) || "年齢は入力ターゲットに準拠";

  let occupation = "購入検討者";
  if (/主婦|主夫/.test(target)) occupation = "主婦・主夫";
  else if (/学生/.test(target)) occupation = "学生";
  else if (/会社員|通勤|オフィス/.test(target)) occupation = "会社員";
  else if (detail?.occupation && !contradictsTarget(target, detail.occupation))
    occupation = detail.occupation;

  const name =
    asString(detail?.name) && !contradictsTarget(target, detail!.name)
      ? detail!.name
      : /会社員|通勤/.test(target)
        ? "あかり"
        : "ゆい";

  return {
    name,
    age,
    occupation,
    lifestyle:
      asString(detail?.lifestyle) && !contradictsTarget(target, detail!.lifestyle)
        ? detail!.lifestyle
        : `${target}としての日常・情報収集`,
    pain: asString(detail?.pain) || pain || `${target}が感じやすい不便`,
  };
}

function contradictsTarget(target: string, text: string): boolean {
  if (/会社員|通勤/.test(target) && /主婦|主夫|34歳の忙しい主婦/.test(text)) {
    return true;
  }
  if (/主婦|主夫/.test(target) && /会社員|通勤だけ/.test(text)) {
    return false;
  }
  if (/20\s*代/.test(target) && /34\s*歳|40\s*代|50\s*代/.test(text)) {
    return true;
  }
  return false;
}

export type GroqAnalyzeContext = {
  request: AnalyzeProductRequest;
  productName: string;
  description: string;
  target: string;
  platform: string;
  productUrl: string;
  imageName: string | null;
  reviewText: string;
  hasUserReview: boolean;
  tiktok: TikTokProductSnapshot | null;
  source: ProductAnalysis["source"];
};

/**
 * Groq で ProductAnalysis を生成。キー未設定や失敗時は null。
 */
export async function analyzeProductWithGroq(
  ctx: GroqAnalyzeContext
): Promise<ProductAnalysis | null> {
  if (!hasGroqApiKey()) return null;

  const heuristicFeatures = extractProductFeatures(
    ctx.productName,
    ctx.description
  );

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: getGroqModel("versatile"),
      messages: [
        {
          role: "system",
          content:
            "あなたは日本語のEC商品アナリストです。必ず指定JSONのみを返し、入力にない事実を捏造しません。",
        },
        {
          role: "user",
          content: buildPrompt({
            productName: ctx.productName,
            description: ctx.description,
            target: ctx.target,
            platform: ctx.platform,
            productUrl: ctx.productUrl,
            imageName: ctx.imageName,
            reviewText: ctx.reviewText,
            hasUserReview: ctx.hasUserReview,
            heuristicFeatures,
          }),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const parsed = parseGroqJsonObject(text);

    const llmFeatures = asStringArray(parsed.productFeatures, 10);
    const features = unique([
      ...llmFeatures,
      ...heuristicFeatures,
    ]).slice(0, 10);

    const sellingPoints = asStringArray(parsed.sellingPoints, 6).filter(
      (s) => s !== ctx.productName && s.length < 40
    );
    const painPoints = asStringArray(parsed.painPoints, 4).map((p) =>
      p.length < 12 ? `${ctx.target}の場面で${p}が気になる` : p
    );
    const hooksRaw = asStringArray(parsed.recommendedHooks, 3)
      .filter((h) => !FORBIDDEN_REVIEW_RE.test(h) && h.length >= 10);
    const hooks =
      hooksRaw.length > 0
        ? hooksRaw
        : [
            `${ctx.target}の場面で、${features[0] || "商品の特徴"}を最初に見せる`,
          ];

    const rawPersona = parsed.buyerPersonaDetail as
      | Record<string, unknown>
      | undefined;
    const personaSeed: BuyerPersonaDetail | undefined = rawPersona
      ? {
          name: asString(rawPersona.name),
          age: asString(rawPersona.age),
          occupation: asString(rawPersona.occupation),
          lifestyle: asString(rawPersona.lifestyle),
          pain: asString(rawPersona.pain),
        }
      : undefined;
    const persona = enforceTargetPersona(
      ctx.target,
      personaSeed,
      painPoints[0] || ""
    );

    const compliance = asStringArray(parsed.complianceNotes, 4);
    const uncertainty = unique([
      ...asStringArray(parsed.uncertainty, 4),
      ...compliance,
      ctx.hasUserReview
        ? ""
        : "実使用レビュー未入力のため、体験談を装う表現は使わない",
    ]);

    const analysis: ProductAnalysis = {
      version: "1.1",
      analysisVersion: "1.1",
      analyzedAt: new Date().toISOString(),
      source: ctx.source,
      productName: ctx.productName,
      summary:
        asString(parsed.summary) ||
        `${ctx.productName}を「${ctx.target}」向けに${ctx.platform}で訴求する分析（Groq）`,
      sellingPoints:
        sellingPoints.length > 0
          ? sellingPoints
          : features.slice(0, 4).map((f) => `${f}を訴求しやすい`),
      painPoints:
        painPoints.length > 0
          ? painPoints
          : [`${ctx.target}の場面での不便を具体化`],
      targetInsight:
        asString(parsed.targetInsight) ||
        `${ctx.target}の不便を先に提示し、商品特徴で解決イメージを示す`,
      salesAngle:
        asString(parsed.salesAngle) ||
        `${ctx.target}向けに特徴を場面で見せる`,
      offerStyle:
        asString(parsed.offerStyle) ||
        (ctx.hasUserReview
          ? "入力レビューを踏まえた紹介"
          : "商品情報ベースの紹介（実体験レビューなし）"),
      cta:
        asString(parsed.cta) ||
        "プロフィールのリンクから詳細をチェック",
      buyerPersona: [
        `${persona.name}（${persona.age} / ${persona.occupation}）`,
        persona.lifestyle,
        `悩み: ${persona.pain}`,
        `入力ターゲット: ${ctx.target}`,
      ].join("。"),
      purchaseReasons: asStringArray(parsed.purchaseReasons, 4),
      differentiation: asStringArray(parsed.differentiation, 4),
      recommendedVideoStructure: asStringArray(
        parsed.recommendedVideoStructure,
        6
      ),
      ctaIdeas: asStringArray(parsed.ctaIdeas, 3),
      productUrl: ctx.productUrl || null,
      hasImage: Boolean(ctx.imageName),
      imageName: ctx.imageName,
      salesScore: mapSalesScore(parsed.salesScore),
      tiktok: ctx.tiktok,
      target: ctx.target,
      platform: ctx.platform,
      category: asString(parsed.category) || "日用品",
      productFeatures: features,
      customerBenefits: asStringArray(parsed.customerBenefits, 4),
      objections: asStringArray(parsed.objections, 3),
      recommendedAngles: asStringArray(parsed.recommendedAngles, 3),
      recommendedHooks: hooks,
      factualClaims: asStringArray(parsed.factualClaims, 8),
      inferredClaims: asStringArray(parsed.inferredClaims, 6),
      uncertainty,
      buyerPersonaDetail: persona,
      hasUserReview: ctx.hasUserReview,
      analysisMode: "groq",
    };

    return normalizeProductAnalysis(analysis);
  } catch (error) {
    console.error("[product-analysis] Groq analyze failed:", error);
    return null;
  }
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = item.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
