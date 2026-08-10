/**
 * 投稿結果 → AI振り返り分析
 */

import type {
  AnalyzePostFeedbackInput,
  OptimizationReflection,
  PostResultMetrics,
} from "./types";
import { resolveAiOptimizationProviderId } from "./provider";

function safeDiv(a: number, b: number): number {
  if (!b || b <= 0) return 0;
  return a / b;
}

function engagementRate(m: PostResultMetrics): number {
  return safeDiv(m.likes + m.comments + m.saves, m.views);
}

function saveRate(m: PostResultMetrics): number {
  return safeDiv(m.saves, m.views);
}

function commentRate(m: PostResultMetrics): number {
  return safeDiv(m.comments, m.views);
}

function clickRate(m: PostResultMetrics): number {
  if (m.clicks == null || m.clicks < 0) return -1;
  return safeDiv(m.clicks, m.views);
}

function purchaseRate(m: PostResultMetrics): number {
  if (m.purchases == null || m.purchases < 0) return -1;
  return safeDiv(m.purchases, m.views);
}

function analyzePostFeedbackMock(
  input: AnalyzePostFeedbackInput
): OptimizationReflection {
  const m = input.metrics;
  const eng = engagementRate(m);
  const save = saveRate(m);
  const comment = commentRate(m);
  const click = clickRate(m);
  const purchase = purchaseRate(m);
  const product = input.productName?.trim() || "この商品";
  const hook = input.hook?.trim() || "";

  const strengths: string[] = [];
  const improvements: string[] = [];
  const nextSuggestions: string[] = [];

  if (m.views >= 1000 || eng >= 0.08) {
    strengths.push("冒頭3秒の離脱は少なかった可能性");
  } else if (m.views > 0 && eng >= 0.04) {
    strengths.push("視聴維持はまずまずのライン");
  } else {
    improvements.push("冒頭フックの強化が必要（離脱が多い可能性）");
    nextSuggestions.push("冒頭を変更");
  }

  if (save >= 0.03 || m.saves >= 20) {
    strengths.push("保存されやすく、後で見返したい内容になっている");
  }

  if (comment >= 0.01 || m.comments >= 10) {
    strengths.push("コメントを誘発できている（議論・質問が起きやすい）");
  } else {
    improvements.push("コメント誘導の問いかけが弱い");
  }

  if (hook && /知らない|損|正直|これ/.test(hook)) {
    strengths.push("商品説明は理解されやすいフック設計");
  } else {
    strengths.push("商品説明は理解されやすい");
  }

  if (click >= 0 && click < 0.01) {
    improvements.push("CTA後の行動誘導が弱い");
    nextSuggestions.push("CTAとプロフ誘導を明確化");
  } else if (click < 0 && eng > 0 && m.likes > m.saves * 2) {
    improvements.push("CTA後の行動誘導が弱い");
    nextSuggestions.push("CTAとプロフ誘導を明確化");
  }

  if (purchase >= 0 && purchase < 0.005 && m.views >= 200) {
    improvements.push("購入までの導線が弱い（興味→行動のギャップ）");
  }

  if (save < 0.02 && m.views >= 100) {
    improvements.push("商品の使用シーン追加推奨");
    nextSuggestions.push("比較形式へ変更");
  }

  if (!nextSuggestions.includes("冒頭を変更") && eng < 0.05) {
    nextSuggestions.push("冒頭を変更");
  }
  if (!nextSuggestions.includes("比較形式へ変更")) {
    nextSuggestions.push("比較形式へ変更");
  }
  if (!nextSuggestions.includes("ターゲット変更")) {
    nextSuggestions.push("ターゲット変更");
  }

  // 重複除去・上位3
  const uniqueNext = [...new Set(nextSuggestions)].slice(0, 3);
  const uniqueStrengths = [...new Set(strengths)].slice(0, 4);
  const uniqueImprovements = [...new Set(improvements)].slice(0, 4);

  if (uniqueStrengths.length === 0) {
    uniqueStrengths.push("投稿データを収集できた（改善の土台になる）");
  }
  if (uniqueImprovements.length === 0) {
    uniqueImprovements.push("さらに尖らせる余地はある（尺・CTA・見せ方）");
  }

  const platformLabel =
    m.platform === "youtube_shorts"
      ? "YouTube Shorts"
      : m.platform === "instagram_reels"
        ? "Instagram Reels"
        : "TikTok";

  const summary = `${product}（${platformLabel}）: 再生${m.views.toLocaleString()} / ENG${(eng * 100).toFixed(1)}%。次は「${uniqueNext[0] || "構成改善"}」から試すのが有効です。`;

  return {
    strengths: uniqueStrengths,
    improvements: uniqueImprovements,
    nextSuggestions: uniqueNext.map((s, i) => {
      const mark = ["①", "②", "③"][i] || `${i + 1}.`;
      return `${mark} ${s}`;
    }),
    summary,
  };
}

/**
 * 投稿データ入力後のAI振り返り
 */
export function analyzePostFeedback(
  input: AnalyzePostFeedbackInput
): OptimizationReflection {
  const provider = resolveAiOptimizationProviderId();
  if (provider === "openai") {
    console.info(
      "[ai-optimization-engine] AI_OPTIMIZATION_PROVIDER=openai だが未接続のため mock を使用"
    );
  }
  return analyzePostFeedbackMock(input);
}

export {
  analyzePostFeedbackMock,
  engagementRate,
  saveRate,
  commentRate,
};
