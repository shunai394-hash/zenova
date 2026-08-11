/**
 * 動画パイプライン用の事実ゲート（scenario / optimize / narration / VideoPlan）
 * ProductAnalysis.confirmed を唯一の商品事実ソースとする。
 */

import type { ProductAnalysis } from "./types";
import type { VideoPlan } from "@/lib/video-pipeline";
import {
  buildSourceBlob,
  containsExperienceClaim,
  containsHypeClaim,
  containsUnsupportedEffect,
  containsUnsupportedMetric,
  expandExcludedClaims,
  hasUnconfirmedProductAssertion,
  isExcludedClaim,
  stripUnsupportedProductClaims,
  type ClaimBuckets,
} from "./claim-guard";
import { getClaimBucketsFromAnalysis } from "./factual-gate";

export type VideoClaimContext = {
  productName: string;
  target?: string;
  analysis?: ProductAnalysis | null;
  buckets?: ClaimBuckets | null;
};

function bucketsOf(ctx: VideoClaimContext): ClaimBuckets {
  if (ctx.buckets) {
    return {
      ...ctx.buckets,
      excluded: expandExcludedClaims(
        ctx.buckets.excluded || [],
        ctx.buckets.confirmed || []
      ),
    };
  }
  if (ctx.analysis) return getClaimBucketsFromAnalysis(ctx.analysis);
  return {
    confirmed: [],
    inferred: [],
    unknown: [],
    excluded: [],
    notSupported: [],
  };
}

/** confirmed + 商品名 + ユーザーターゲットのみ（summary / inferred は入れない） */
function sourceOf(ctx: VideoClaimContext): string {
  const buckets = bucketsOf(ctx);
  return buildSourceBlob({
    productName: ctx.productName,
    description: [...(buckets.confirmed || []), ctx.target || ""]
      .filter(Boolean)
      .join("\n"),
  });
}

function isStructuralOrCtaText(text: string, productName: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (productName && t === productName) return true;
  // 構成・誘導のみで、商品スペック主張を含まない
  return (
    /プロフィール|リンクから|詳細を|チェック|フォロー|保存して|画面に出|次の行動|短く紹介|どうぞ|見てね/.test(
      t
    ) &&
    !/\d+\s*%|UPF|UV\d+|保湿|防水|充電|通気|改善|治療|使ってみた/.test(t)
  );
}

/**
 * 単一文の商品主張を検証。
 * 根拠は confirmed（＋商品名・ターゲット）のみ。補完はしない。
 * 禁止語リストではなく「confirmed に根拠があるか」を基本判定にする。
 */
export function validateVideoClaimText(
  text: string,
  ctx: VideoClaimContext
): string {
  const raw = (text || "").trim();
  if (!raw) return "";

  const buckets = bucketsOf(ctx);
  const sourceBlob = sourceOf(ctx);

  if (
    containsExperienceClaim(raw) ||
    containsUnsupportedEffect(raw) ||
    containsUnsupportedMetric(raw) ||
    containsHypeClaim(raw)
  ) {
    return "";
  }

  // excluded（関連語拡張後）の肯定言及を拒否
  for (const ex of buckets.excluded || []) {
    if (!ex) continue;
    if (raw.includes(ex) && !/非対応|ではありません|できない/.test(raw)) {
      const inConfirmed = (buckets.confirmed || []).some(
        (c) => c.includes(ex) || ex.includes(c)
      );
      if (!inConfirmed || isExcludedClaim(ex, buckets.excluded)) {
        return "";
      }
    }
  }

  if (isStructuralOrCtaText(raw, ctx.productName)) {
    return raw;
  }

  // 主判定: confirmed 外の機能・数値・効果主張
  if (hasUnconfirmedProductAssertion(raw, buckets, sourceBlob)) {
    return "";
  }

  const stripped = stripUnsupportedProductClaims(raw, buckets, sourceBlob);
  if (!stripped) return "";

  if (containsUnsupportedMetric(stripped)) return "";
  if (containsExperienceClaim(stripped)) return "";
  if (containsUnsupportedEffect(stripped)) return "";
  if (hasUnconfirmedProductAssertion(stripped, buckets, sourceBlob)) {
    return "";
  }

  // ほぼ空の confirmed: 素材・重量・性能・レビューの捏造を拒否
  if (!(buckets.confirmed || []).length) {
    if (
      /素材|重量|性能|効果|レビュー|口コミ|使ってみた|してみた|\d+\s*g|\d+\s*%/.test(
        stripped
      )
    ) {
      return "";
    }
  }

  return stripped;
}

/** 互換エイリアス（下流再利用） */
export const validateVideoClaims = validateVideoClaimText;

export function validateVideoClaimsRecord<T extends Record<string, string>>(
  fields: T,
  ctx: VideoClaimContext,
  options?: { fallback?: Partial<T>; keys?: Array<keyof T> }
): T {
  const keys = options?.keys || (Object.keys(fields) as Array<keyof T>);
  const out = { ...fields };
  for (const key of keys) {
    const original = String(fields[key] ?? "");
    const safe = validateVideoClaimText(original, ctx);
    if (safe) {
      out[key] = safe as T[keyof T];
    } else if (options?.fallback && options.fallback[key]) {
      out[key] = options.fallback[key] as T[keyof T];
    } else {
      const confirmed = bucketsOf(ctx).confirmed;
      if (confirmed[0] && /hook|scene|angle|selling/i.test(String(key))) {
        out[key] = `${confirmed[0]}を紹介` as T[keyof T];
      } else if (/cta/i.test(String(key))) {
        out[key] = "プロフィールのリンクから詳細をチェック" as T[keyof T];
      } else {
        out[key] = "" as T[keyof T];
      }
    }
  }
  return out;
}

/** シナリオ JSON の各日本語フィールドをゲート */
export function validateSalesScenarioClaims(
  scenario: {
    target_customer: string;
    selling_angle: string;
    hook_0_2sec: string;
    scene_1: string;
    scene_2: string;
    scene_3: string;
    cta: string;
    kling_prompt: string;
  },
  ctx: VideoClaimContext
) {
  const jp = validateVideoClaimsRecord(
    {
      target_customer: scenario.target_customer,
      selling_angle: scenario.selling_angle,
      hook_0_2sec: scenario.hook_0_2sec,
      scene_1: scenario.scene_1,
      scene_2: scenario.scene_2,
      scene_3: scenario.scene_3,
      cta: scenario.cta,
    },
    ctx,
    {
      fallback: {
        target_customer: ctx.target || "購入検討者",
        cta: "プロフィールのリンクから詳細をチェック",
      },
    }
  );

  // kling_prompt は英語映像指示。数値スペック・体験英語も簡易除去
  let kling = scenario.kling_prompt || "";
  if (
    /\d+\s*%|UPF\s*\d+|tried it|honest review|cures|heals/i.test(kling) ||
    hasUnconfirmedProductAssertion(kling, bucketsOf(ctx), sourceOf(ctx)) ||
    (bucketsOf(ctx).excluded || []).some(
      (ex) => ex && kling.toLowerCase().includes(ex.toLowerCase())
    )
  ) {
    const conf =
      bucketsOf(ctx).confirmed.slice(0, 3).join(", ") || "product features";
    kling = `Create a vertical TikTok commercial video showing ${ctx.productName} with confirmed features only: ${conf}. No fabricated specs, ratings, or testimonials. 9:16, no text overlay, no watermark.`;
  }

  return {
    ...scenario,
    ...jp,
    kling_prompt: kling,
  };
}

export function validateOptimizeClaims(
  result: {
    score: number;
    improvements: string[];
    optimized_hook: string;
    optimized_scene_1: string;
    optimized_scene_2: string;
    optimized_scene_3: string;
    optimized_cta: string;
    optimized_kling_prompt: string;
  },
  ctx: VideoClaimContext,
  prior?: {
    hook: string;
    scene_1: string;
    scene_2: string;
    scene_3: string;
    cta: string;
  }
) {
  const gated = validateSalesScenarioClaims(
    {
      target_customer: ctx.target || "",
      selling_angle: "",
      hook_0_2sec: result.optimized_hook,
      scene_1: result.optimized_scene_1,
      scene_2: result.optimized_scene_2,
      scene_3: result.optimized_scene_3,
      cta: result.optimized_cta,
      kling_prompt: result.optimized_kling_prompt,
    },
    ctx
  );

  return {
    ...result,
    improvements: (result.improvements || []).filter(
      (i) =>
        !containsUnsupportedMetric(i) &&
        !containsUnsupportedEffect(i) &&
        !containsExperienceClaim(i) &&
        !hasUnconfirmedProductAssertion(i, bucketsOf(ctx), sourceOf(ctx))
    ),
    optimized_hook: gated.hook_0_2sec || prior?.hook || gated.hook_0_2sec,
    optimized_scene_1: gated.scene_1 || prior?.scene_1 || "",
    optimized_scene_2: gated.scene_2 || prior?.scene_2 || "",
    optimized_scene_3: gated.scene_3 || prior?.scene_3 || "",
    optimized_cta:
      gated.cta || prior?.cta || "プロフィールのリンクから詳細をチェック",
    optimized_kling_prompt: gated.kling_prompt,
  };
}

export function validateNarrationScript(
  script: string,
  ctx: VideoClaimContext
): string {
  const safe = validateVideoClaimText(script, ctx);
  if (safe) return safe;

  // 文単位で落とす
  const parts = script
    .split(/[。！？\n]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => validateVideoClaimText(p, ctx))
    .filter(Boolean);

  if (parts.length > 0) return parts.join("。") + "。";

  const conf = bucketsOf(ctx).confirmed.slice(0, 3);
  if (conf.length === 0) {
    return `${ctx.productName}の入力情報を短く紹介します。詳細はプロフィールのリンクから。`;
  }
  return `${ctx.productName}。${conf.join("、")}。詳細はプロフィールのリンクから。`;
}

/** VideoPlan 全体の最終検査 */
export function validateVideoPlanClaims(
  plan: VideoPlan,
  ctx: VideoClaimContext
): VideoPlan {
  const conf0 = bucketsOf(ctx).confirmed[0];
  return {
    ...plan,
    title:
      validateVideoClaimText(plan.title, ctx) || ctx.productName || plan.title,
    cta:
      validateVideoClaimText(plan.cta || "", ctx) ||
      "プロフィールのリンクから詳細をチェック",
    timeline: (plan.timeline || []).map((item) => ({
      ...item,
      text:
        validateVideoClaimText(item.text, ctx) ||
        (conf0 ? `${conf0}を紹介` : item.scene || "紹介"),
    })),
  };
}

/** 日英の架空体験・レビュー主張（style 演出ではなく事実主張） */
const KLING_EXPERIENCE_ASSERTION_RE =
  /使ってみた|使った結果|実際に使|実際に試|愛用|本音レビュー|正直レビュー|使用感|効果を実感|使用して実感|体験者|愛用者の声|tried it|honest review|personal experience|testimonial|felt the effect|love using/i;

function buildSafeKlingPromptFromConfirmed(ctx: VideoClaimContext): string {
  const buckets = bucketsOf(ctx);
  const conf = buckets.confirmed.slice(0, 6).join(", ") || "none";
  const excluded = (buckets.excluded || []).slice(0, 6).join(", ");
  return [
    `Create a vertical TikTok commercial video showing ${ctx.productName}`,
    "handheld UGC-style framing with product held toward camera, clear close-ups",
    `confirmed features only: ${conf}`,
    excluded ? `do not claim: ${excluded}` : "",
    "No fabricated specs, ratings, testimonials, or personal experience claims",
    "9:16, no text overlay, no watermark",
  ]
    .filter(Boolean)
    .join(". ");
}

/**
 * Kling 投入直前の薄い adapter。
 * style + VideoPlan由来文言 + confirmed を結合した最終プロンプトを検査し、
 * 体験主張・未根拠スペックがあれば安全なプロンプトへ置換する。
 */
export function validateKlingPromptClaims(
  prompt: string,
  ctx: VideoClaimContext
): string {
  const raw = (prompt || "").trim();
  if (!raw) return buildSafeKlingPromptFromConfirmed(ctx);

  const buckets = bucketsOf(ctx);
  const sourceBlob = sourceOf(ctx);

  if (
    KLING_EXPERIENCE_ASSERTION_RE.test(raw) ||
    containsExperienceClaim(raw) ||
    containsUnsupportedMetric(raw) ||
    containsUnsupportedEffect(raw) ||
    containsHypeClaim(raw)
  ) {
    return buildSafeKlingPromptFromConfirmed(ctx);
  }

  if (hasUnconfirmedProductAssertion(raw, buckets, sourceBlob)) {
    return buildSafeKlingPromptFromConfirmed(ctx);
  }

  // excluded の肯定言及（英語プロンプトでも部分一致で拒否）
  for (const ex of buckets.excluded || []) {
    if (!ex) continue;
    if (raw.toLowerCase().includes(ex.toLowerCase())) {
      // do_not_claim= メタ行は許可
      if (new RegExp(`do_not_claim=[^\\.]*${ex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(raw)) {
        continue;
      }
      return buildSafeKlingPromptFromConfirmed(ctx);
    }
  }

  return raw;
}

/** confirmed のみから安全なシナリオを組み立て（fallback） */
export function buildFallbackScenarioFromConfirmed(input: {
  productName: string;
  target: string;
  confirmed: string[];
  cta?: string;
}): {
  target_customer: string;
  selling_angle: string;
  hook_0_2sec: string;
  scene_1: string;
  scene_2: string;
  scene_3: string;
  cta: string;
  kling_prompt: string;
} {
  const conf = input.confirmed.filter(Boolean);
  const f0 = conf[0] || "入力された特徴";
  const f1 = conf[1] || f0;
  const f2 = conf[2] || f1;
  const cta = input.cta || "プロフィールのリンクから詳細をチェック";
  return {
    target_customer: input.target || "購入検討者",
    selling_angle: conf.length
      ? `${input.target}向けに、${f0}など確認済み特徴を伝える`
      : `${input.target}向けに、入力情報の範囲で紹介する`,
    hook_0_2sec: conf.length
      ? `${input.target}向けに、${f0}を最初に見せる`
      : `${input.productName}を短く紹介`,
    scene_1: `${input.productName}を画面に出す`,
    scene_2: conf.length ? `${f0} / ${f1}` : "入力情報の範囲で特徴を伝える",
    scene_3: conf.length ? `${f2}を整理して見せる` : "次の行動を案内",
    cta,
    kling_prompt: `Create a vertical TikTok commercial video showing ${input.productName} using only confirmed features: ${conf.join(", ") || "none"}. No fabricated specs or testimonials. 9:16, no text overlay, no watermark.`,
  };
}

/** プロンプトに埋め込む confirmed ブロック */
export function buildConfirmedPromptBlock(
  analysis: ProductAnalysis | null | undefined
): string {
  if (!analysis) {
    return `confirmed: (なし)
excluded: (なし)
unknown: (埋めない)
inferred: (商品スペックとして使わない)`;
  }
  const b = getClaimBucketsFromAnalysis(analysis);
  return `confirmed（商品事実の唯一の正本）: ${b.confirmed.join(" / ") || "(なし)"}
excluded / notSupported（肯定禁止）: ${b.excluded.join(" / ") || "(なし)"}
unknown（埋めない）: ${b.unknown.join(" / ") || "(なし)"}
inferred（推定のみ・スペック禁止）: ${(b.inferred || []).join(" / ") || "(なし)"}`;
}
