/**
 * 動画改善提案
 * 現状はルールベース。将来 OpenAI API 等へ差し替え。
 */

import type {
  VideoIntentBrief,
  VideoOptimizationItem,
  VideoOptimizationResult,
} from "./types";
import { resolveAiSalesProviderId } from "./provider";

export type OptimizeVideoInput = {
  hook?: string | null;
  cta?: string | null;
  structure?: string | null;
  durationSec?: number | null;
  productName?: string | null;
  style?: string | null;
  goal?: string | null;
  targetAudience?: string | null;
  whoFor?: string | null;
};

export type BuildVideoIntentInput = {
  goal?: string | null;
  targetAudience?: string | null;
  whoFor?: string | null;
  feature?: string | null;
  concept?: string | null;
  emotions?: string[] | null;
};

const GOAL_PURPOSE: Record<string, string> = {
  purchase: "購入促進",
  affiliate_click: "アフィリエイトクリック",
  brand_awareness: "認知・信頼の獲得",
};

/**
 * Preview「この動画が狙っていること」
 */
export function buildVideoIntentBrief(
  input: BuildVideoIntentInput
): VideoIntentBrief {
  const goal = input.goal || "purchase";
  const audience =
    input.targetAudience ||
    input.whoFor ||
    "20代女性";

  const emotions =
    input.emotions?.filter(Boolean).slice(0, 3) ||
    (goal === "affiliate_click"
      ? ["便利そう", "欲しい", "今すぐ見たい"]
      : goal === "brand_awareness"
        ? ["信頼できそう", "試したい", "保存したい"]
        : ["便利そう", "欲しい", "試したい"]);

  return {
    purpose: GOAL_PURPOSE[goal] || "購入促進",
    audience,
    emotions,
    purchasePath: "コメント→プロフィール→購入",
  };
}

function optimizeSalesVideoMock(
  input: OptimizeVideoInput
): VideoOptimizationResult {
  const product = input.productName?.trim() || "この商品";
  const hook = input.hook?.trim() || "";
  const cta = input.cta?.trim() || "";
  const duration = input.durationSec ?? 30;
  const structure = input.structure?.trim() || "";
  const target =
    input.targetAudience?.trim() || input.whoFor?.trim() || "20代女性";

  const startsWithProduct =
    !hook ||
    /商品|紹介|スペック|機能|価格/.test(hook) ||
    /^商品の説明/.test(structure);

  const items: VideoOptimizationItem[] = [
    {
      id: "hook",
      label: "冒頭3秒を強化",
      before: startsWithProduct
        ? "商品の説明から開始"
        : hook || "現状の冒頭",
      after: startsWithProduct
        ? "最初に悩みを提示することで視聴維持率を高めます"
        : `「これ知らない人、毎朝損しています」のように損失回避で止める`,
      tip: "最初の1秒は顔 or 商品アップ＋悩み・損失回避が強いです",
    },
    {
      id: "presentation",
      label: "商品の見せ方変更",
      before: structure
        ? structure.split("\n").slice(0, 2).join(" → ").slice(0, 48) ||
          "説明中心の見せ方"
        : "スペック説明から入る見せ方",
      after: "悩み → 商品登場 → 使用シーンのアップ → 変化/メリット",
      tip: "手に持つ・使う瞬間を大きく見せると欲求が上がります",
    },
    {
      id: "cta",
      label: "CTA変更",
      before: cta || "行動誘導が弱い / 未設定",
      after:
        "気になった人はプロフィールのリンクからチェック（保存も忘れずに）",
      tip: "行動は1つに絞り、保存とプロフ誘導をセットに",
    },
    {
      id: "duration",
      label: "動画尺変更",
      before: duration > 0 ? `約${duration}秒` : "尺情報なし",
      after:
        duration > 40
          ? "35〜40秒前後にまとめ、メリットを1つに絞る"
          : duration > 0 && duration < 15
            ? "30〜40秒まで伸ばし、使用感を1カット追加"
            : "現状の尺でOK。テンポを落とさないことが重要",
      tip: "TikTokは15〜40秒が反応のバランスが良い帯域です",
    },
    {
      id: "target",
      label: "ターゲット変更",
      before: target,
      after: /20代/.test(target)
        ? "美容意識の高い20〜30代女性に絞り、朝の習慣シーンに寄せる"
        : `${target}のうち「今すぐ解決したい層」に絞る`,
      tip: "ターゲットを1人格に絞るとフックとCTAが尖ります",
    },
  ];

  return {
    summary: `${product}の動画は、冒頭・見せ方・CTA・尺・ターゲットを揃えると販売導線が明確になります。`,
    items,
  };
}

export function optimizeSalesVideo(
  input: OptimizeVideoInput
): VideoOptimizationResult {
  const provider = resolveAiSalesProviderId();
  if (provider === "openai") {
    console.info(
      "[ai-sales-engine] AI_PROVIDER=openai だが未接続のため mock を使用"
    );
  }
  return optimizeSalesVideoMock(input);
}
