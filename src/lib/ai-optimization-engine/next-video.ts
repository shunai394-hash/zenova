/**
 * 次の動画3案生成（別フック / 別ターゲット / 別構成）
 */

import type { GenerateNextVideosInput, NextVideoIdea } from "./types";
import { resolveAiOptimizationProviderId } from "./provider";

function generateNextVideoIdeasMock(
  input: GenerateNextVideosInput
): NextVideoIdea[] {
  const product = input.productName.trim() || "この商品";
  const baseTarget = input.target?.trim() || "20代女性";
  const baseHook = input.hook?.trim() || "これ知らない人、損してます";
  const focusFromReflection =
    input.reflection?.nextSuggestions.map((s) => s.replace(/^[①②③]\s*/, "")) ||
    [];

  const altTarget = /20代/.test(baseTarget)
    ? "美容意識の高い30代女性"
    : /男性|ガジェット/.test(baseTarget)
      ? "忙しい会社員（男女）"
      : "プレゼント需要の20〜30代";

  const ideaHook: NextVideoIdea = {
    id: "next-hook",
    title: `${product} — 別フック案`,
    focus: "hook",
    focusLabel: "別フック",
    hook: focusFromReflection.some((s) => /冒頭/.test(s))
      ? "正直に言うと、これ知らないと毎朝損してます"
      : `まだ${baseHook.replace(/。$/, "")}？`,
    target: baseTarget,
    structure: [
      "0-3秒 強い損失回避フック",
      "3-10秒 共感できる悩み",
      "10-25秒 商品の一押しメリット",
      "25-35秒 使用シーン",
      "35-40秒 CTA",
    ],
    reason: "前回より冒頭で止めて、離脱をさらに下げる狙い",
  };

  const ideaTarget: NextVideoIdea = {
    id: "next-target",
    title: `${product} — 別ターゲット案`,
    focus: "target",
    focusLabel: "別ターゲット",
    hook: `${altTarget}向けに刺さる一言から開始`,
    target: altTarget,
    structure: [
      "0-3秒 ターゲット呼びかけ",
      "3-12秒 その層特有の悩み",
      "12-28秒 商品が合う理由",
      "28-35秒 使用感",
      "35-40秒 CTA",
    ],
    reason: "視聴者層をずらして反応差をテストする",
  };

  const ideaStructure: NextVideoIdea = {
    id: "next-structure",
    title: `${product} — 別構成案（比較）`,
    focus: "structure",
    focusLabel: "別構成",
    hook: "どっちが正解？ 30秒で結論出します",
    target: baseTarget,
    structure: [
      "0-3秒 比較の問いかけ",
      "3-12秒 A案の弱点",
      "12-25秒 B案（商品）の強み",
      "25-35秒 結論・使用感",
      "35-40秒 CTA",
    ],
    reason:
      focusFromReflection.some((s) => /比較/.test(s))
        ? "改善提案どおり比較形式で価値を可視化"
        : "説明型から比較型へ変え、理解と保存を伸ばす",
  };

  return [ideaHook, ideaTarget, ideaStructure];
}

/**
 * 同じ商品で次の動画3案を生成
 */
export function generateNextVideoIdeas(
  input: GenerateNextVideosInput
): NextVideoIdea[] {
  const provider = resolveAiOptimizationProviderId();
  if (provider === "openai") {
    console.info(
      "[ai-optimization-engine] next-video: openai 未接続のため mock を使用"
    );
  }
  return generateNextVideoIdeasMock(input);
}

export { generateNextVideoIdeasMock };
