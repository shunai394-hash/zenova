import type { AiPlanBrief } from "@/lib/analyze/plan-brief";

/** AI企画書の品質スコア */
export type PlanQualityResult = {
  score: number;
  grade: "S" | "A" | "B" | "C" | "D";
  /** 点数の根拠 */
  reasons: string[];
  /** 改善提案 */
  improvements: string[];
};

function gradeFromScore(score: number): PlanQualityResult["grade"] {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * 企画書テキストの完成度をヒューリスティック採点。
 * （外部API不要・即時）
 */
export function scorePlanBrief(brief: AiPlanBrief): PlanQualityResult {
  let score = 40;
  const reasons: string[] = [];
  const improvements: string[] = [];

  const hook = brief.firstThreeSeconds.trim();
  const cta = brief.cta.trim();
  const structure = brief.structure.trim();
  const target = brief.target.trim();
  const pain = brief.painPoints.trim();
  const reason = brief.reason.trim();
  const cautions = brief.cautions.trim();

  if (hook.length >= 12) {
    score += 12;
    reasons.push("最初の3秒に具体的なフックがある");
  } else {
    improvements.push("最初の3秒をより具体的・感情的にしてスクロールを止める");
  }

  if (/[？?]/.test(hook) || /知らない|正直|これ/.test(hook)) {
    score += 6;
    reasons.push("冒頭に問いかけ・本音フックがある");
  } else {
    improvements.push("冒頭に問いかけや「正直に言うと」系のフックを入れる");
  }

  if (cta.length >= 8) {
    score += 10;
    reasons.push("CTAが明確");
  } else {
    improvements.push("CTAを「プロフのリンクから」など行動が分かる一文にする");
  }

  if (structure.split("\n").filter(Boolean).length >= 3) {
    score += 12;
    reasons.push("おすすめ構成が3ビート以上ある");
  } else {
    improvements.push("構成をフック→本編→証拠→CTAの4ビートに拡充する");
  }

  if (target.length >= 8) {
    score += 8;
    reasons.push("ターゲットが定義されている");
  } else {
    improvements.push("ターゲットを年齢・シーン付きで具体化する");
  }

  if (pain.length >= 6) {
    score += 8;
    reasons.push("顧客の悩みが書かれている");
  } else {
    improvements.push("悩みを1〜3行で具体的に書く");
  }

  if (reason.length >= 12) {
    score += 6;
    reasons.push("おすすめ理由がある");
  } else {
    improvements.push("なぜこの企画が効くのかを1文追加する");
  }

  if (cautions.length >= 8) {
    score += 4;
    reasons.push("注意点（コンプラ）が記載されている");
  } else {
    improvements.push("誇大表現を避ける注意点を追記する");
  }

  score = clamp(score);
  if (reasons.length === 0) {
    reasons.push("基本項目は入力済み。さらに具体性を上げると伸びやすい");
  }

  return {
    score,
    grade: gradeFromScore(score),
    reasons: reasons.slice(0, 5),
    improvements: improvements.slice(0, 5),
  };
}

/**
 * ワンクリック改善: 不足項目をテンプレで補強した企画書を返す。
 */
export function applyPlanBriefImprovements(
  brief: AiPlanBrief,
  quality?: PlanQualityResult
): AiPlanBrief {
  const q = quality ?? scorePlanBrief(brief);
  const next = { ...brief };

  if (!next.firstThreeSeconds.trim() || next.firstThreeSeconds.trim().length < 12) {
    const pain = next.painPoints.split("\n")[0]?.trim();
    next.firstThreeSeconds = pain
      ? `正直に言うと…${pain}、これで変わりました`
      : "これ知らないと損するかも。最初の3秒だけ見て";
  } else if (!/[？?]/.test(next.firstThreeSeconds)) {
    next.firstThreeSeconds = `${next.firstThreeSeconds.trim()}、知ってた？`;
  }

  if (!next.cta.trim() || next.cta.trim().length < 8) {
    next.cta = "気になった人はプロフィールのリンクからチェックしてね";
  }

  if (next.structure.split("\n").filter(Boolean).length < 3) {
    next.structure = [
      "1. フック（悩み・意外性）",
      "2. 商品の見せ場・使用感",
      "3. ベネフィット証拠",
      "4. CTA（プロフ誘導）",
      next.structure.trim(),
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (!next.target.trim() || next.target.trim().length < 8) {
    next.target = "20〜40代・スマホで買い物する忙しい人（通勤・休憩中）";
  }

  if (!next.painPoints.trim()) {
    next.painPoints =
      "時間がなくて比較できない\n失敗したくない\n本当に効果があるか不安";
  }

  if (!next.reason.trim() || next.reason.trim().length < 12) {
    next.reason =
      "短尺で悩み→解決→行動まで一気に見せられるため、TikTokでの保存・プロフ誘導に向いています。";
  }

  if (!next.cautions.trim()) {
    next.cautions =
      "効果の断定・他社誹謗は避ける\n景表法・薬機法に注意\nPR表記を忘れない";
  }

  if (q.improvements.length === 0 && next.recommendationScore) {
    // already strong — lightly sharpen hook
    if (!next.firstThreeSeconds.includes("…") && !next.firstThreeSeconds.includes("...")) {
      next.firstThreeSeconds = `…${next.firstThreeSeconds}`;
    }
  }

  return next;
}
