import { VIDEO_TEMPLATES, VIDEO_TEMPLATE_LIST } from "./templates";
import type {
  TemplateSelectionInput,
  TemplateSelectionResult,
  VideoTemplate,
  VideoTemplateId,
} from "./types";

type ScoreBucket = {
  id: VideoTemplateId;
  score: number;
  reasons: string[];
};

function includesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function scoreTemplate(
  template: VideoTemplate,
  input: TemplateSelectionInput
): ScoreBucket {
  const salesAngle = (input.salesAngle ?? "").toLowerCase();
  const category = (input.category ?? "").toLowerCase();
  const target = (input.target ?? "").toLowerCase();
  const productName = (input.productName ?? "").toLowerCase();
  const description = (input.description ?? "").toLowerCase();
  const offerStyle = (input.offerStyle ?? "").toLowerCase();
  const blob = `${salesAngle} ${category} ${target} ${productName} ${description} ${offerStyle}`;

  let score = 0;
  const reasons: string[] = [];

  // カテゴリ適合
  if (
    template.bestFor.some((item) => category.includes(item.toLowerCase()))
  ) {
    score += 30;
    reasons.push(`カテゴリ「${input.category}」との相性が高い`);
  }

  switch (template.id) {
    case "problem_solution": {
      if (
        includesAny(blob, [
          "悩み",
          "解決",
          "不便",
          "問題",
          "時短",
          "問題解決",
          "短尺販売",
        ])
      ) {
        score += 35;
        reasons.push("販売アングルが悩み→解決型");
      }
      if (includesAny(target, ["会社員", "通勤", "忙しい", "初心者"])) {
        score += 10;
        reasons.push("ターゲットが課題解決訴求向き");
      }
      // TikTok短尺のデフォルト寄り
      score += 8;
      break;
    }
    case "before_after": {
      if (
        includesAny(blob, [
          "before",
          "after",
          "ビフォー",
          "アフター",
          "変化",
          "効果",
          "改善",
          "実演",
        ])
      ) {
        score += 40;
        reasons.push("変化・効果が伝わるアングル");
      }
      if (
        includesAny(category, ["ビューティー", "美容", "ヘルスケア", "掃除"])
      ) {
        score += 15;
        reasons.push("カテゴリがビフォーアフター向き");
      }
      break;
    }
    case "unboxing": {
      if (
        includesAny(blob, [
          "開封",
          "レビュー",
          "実物",
          "質感",
          "unbox",
          "アップロード画像",
        ])
      ) {
        score += 40;
        reasons.push("実物感・開封レビュー向き");
      }
      if (includesAny(category, ["ガジェット", "ファッション"])) {
        score += 12;
        reasons.push("カテゴリが開封向き");
      }
      break;
    }
    case "comparison": {
      if (
        includesAny(blob, [
          "比較",
          "コスパ",
          "違い",
          "vs",
          "選び方",
          "差別化",
          "解説",
        ])
      ) {
        score += 40;
        reasons.push("比較・選び方訴求が強い");
      }
      if (includesAny(target, ["迷", "比較", "検討"])) {
        score += 10;
        reasons.push("ターゲットが比較検討層");
      }
      break;
    }
    case "lifestyle": {
      if (
        includesAny(blob, [
          "ライフスタイル",
          "世界観",
          "日常",
          "ルーティン",
          "雰囲気",
          "保存",
        ])
      ) {
        score += 40;
        reasons.push("世界観・日常埋め込み型");
      }
      if (
        includesAny(category, ["ファッション", "ビューティー", "ライフスタイル"])
      ) {
        score += 12;
        reasons.push("カテゴリがライフスタイル向き");
      }
      break;
    }
  }

  return { id: template.id, score, reasons };
}

/**
 * 商品分析結果から最適なTikTok販売動画テンプレートを選択する。
 */
export function selectVideoTemplate(
  input: TemplateSelectionInput
): TemplateSelectionResult {
  const scored = VIDEO_TEMPLATE_LIST.map((template) =>
    scoreTemplate(template, input)
  ).sort((a, b) => b.score - a.score);

  const best = scored[0] ?? {
    id: "problem_solution" as const,
    score: 0,
    reasons: ["デフォルトテンプレート"],
  };

  const template = VIDEO_TEMPLATES[best.id];

  return {
    template,
    score: best.score,
    reasons:
      best.reasons.length > 0
        ? best.reasons
        : ["明確なシグナルが弱いため汎用の悩み→解決を選択"],
    alternatives: scored.slice(1, 4).map((item) => ({
      id: item.id,
      score: item.score,
    })),
  };
}

/** 既存 generate-video の product_name 文字列へテンプレート情報を追記（契約は維持） */
export function formatTemplateForApiInput(
  selection: TemplateSelectionResult
): string {
  const { template, reasons } = selection;
  return [
    "【販売動画テンプレート】",
    `ID: ${template.id}`,
    `名称: ${template.nameJa} (${template.name})`,
    `説明: ${template.description}`,
    `尺: ${template.durationSec}秒`,
    `フック方針: ${template.hookStyle}`,
    `CTA方針: ${template.ctaStyle}`,
    "構成ビート:",
    ...template.beats.map(
      (beat) => `- ${beat.timing}s ${beat.title}: ${beat.direction}`
    ),
    "選定理由:",
    ...reasons.map((reason) => `- ${reason}`),
    "",
    "上記テンプレートに沿って15秒動画の企画を作成してください。",
  ].join("\n");
}

export function appendTemplateToProductName(
  productNamePayload: string,
  selection: TemplateSelectionResult
): string {
  return `${productNamePayload}\n\n${formatTemplateForApiInput(selection)}`;
}
