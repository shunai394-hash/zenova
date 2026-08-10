import type {
  VideoIntelligenceScore,
  VideoPerformanceMetrics,
  VideoPatternInsight,
} from "./types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function safeRate(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return numerator / denominator;
}

export function computeEngagementRate(metrics: VideoPerformanceMetrics): number {
  const { views, likes, comments } = metrics;
  return safeRate(likes + comments * 2, views) * 100;
}

export function computeCtr(metrics: VideoPerformanceMetrics): number {
  return safeRate(metrics.clicks, metrics.views) * 100;
}

export function computeConversionRate(metrics: VideoPerformanceMetrics): number {
  if (metrics.clicks > 0) {
    return safeRate(metrics.conversions, metrics.clicks) * 100;
  }
  return metrics.conversions > 0 ? 10 : 0;
}

function gradeFromTotal(total: number): VideoIntelligenceScore["grade"] {
  if (total >= 90) return "S";
  if (total >= 80) return "A";
  if (total >= 65) return "B";
  if (total >= 50) return "C";
  return "D";
}

function labelFromGrade(grade: VideoIntelligenceScore["grade"]): string {
  switch (grade) {
    case "S":
      return "非常に強い勝ちパターン";
    case "A":
      return "再現性の高い勝ちパターン";
    case "B":
      return "平均以上のパターン";
    case "C":
      return "改善余地あり";
    case "D":
      return "学習データ不足 / 弱い";
  }
}

/**
 * 動画成果からインテリジェンススコア（0-100）を算出。
 * 商品分析・テンプレート選定の重み付けに利用する。
 */
export function scoreVideoPerformance(
  metrics: VideoPerformanceMetrics
): VideoIntelligenceScore {
  const engagement = computeEngagementRate(metrics);
  const ctr = computeCtr(metrics);
  const cvr = computeConversionRate(metrics);

  const reachScore = clamp(Math.log10(metrics.views + 1) * 22);
  const engagementScore = clamp(engagement * 8);
  const ctrScore = clamp(ctr * 12);
  const cvrScore = clamp(cvr * 6);
  const salesScore = clamp(
    metrics.conversions * 8 + Math.log10(metrics.revenue + 1) * 10
  );

  const total = clamp(
    reachScore * 0.25 +
      engagementScore * 0.2 +
      ctrScore * 0.2 +
      cvrScore * 0.2 +
      salesScore * 0.15
  );

  const grade = gradeFromTotal(total);
  const tips: string[] = [];

  if (metrics.views < 1000) tips.push("再生数が少ないため、フック改善を優先");
  if (engagement < 3) tips.push("いいね/コメントが弱い。冒頭3秒の感情刺激を強化");
  if (ctr < 1) tips.push("CTRが低い。CTAのタイミングと文言を見直す");
  if (cvr < 2 && metrics.clicks > 0) {
    tips.push("クリック後の成約が弱い。商品ページ/オファーを改善");
  }
  if (tips.length === 0) tips.push("このパターンは横展開候補");

  return {
    total,
    engagement_rate: Number(engagement.toFixed(4)),
    ctr: Number(ctr.toFixed(4)),
    conversion_rate: Number(cvr.toFixed(4)),
    grade,
    label: labelFromGrade(grade),
    tips: tips.slice(0, 4),
  };
}

/**
 * カテゴリ × テンプレート × フック の勝ちパターン集計。
 */
export function aggregatePatternInsights(
  rows: Array<{
    product_category: string;
    video_template: string;
    hook_type: string;
    intelligence_score: number | null;
    views: number;
    clicks?: number;
    conversions: number;
    revenue: number;
    ctr?: number | null;
    conversion_rate?: number | null;
  }>
): VideoPatternInsight[] {
  const map = new Map<
    string,
    {
      product_category: string;
      video_template: string;
      hook_type: string;
      scores: number[];
      views: number[];
      conversions: number[];
      revenue: number[];
      ctrs: number[];
      cvrs: number[];
    }
  >();

  for (const row of rows) {
    const key = [
      row.product_category || "その他",
      row.video_template || "unknown",
      row.hook_type || "other",
    ].join("::");

    const current = map.get(key) ?? {
      product_category: row.product_category || "その他",
      video_template: row.video_template || "unknown",
      hook_type: row.hook_type || "other",
      scores: [],
      views: [],
      conversions: [],
      revenue: [],
      ctrs: [],
      cvrs: [],
    };

    current.scores.push(row.intelligence_score ?? 0);
    current.views.push(row.views);
    current.conversions.push(row.conversions);
    current.revenue.push(Number(row.revenue) || 0);

    const ctr =
      typeof row.ctr === "number"
        ? row.ctr
        : computeCtr({
            views: row.views,
            likes: 0,
            comments: 0,
            clicks: row.clicks ?? 0,
            conversions: row.conversions,
            revenue: Number(row.revenue) || 0,
          });
    const cvr =
      typeof row.conversion_rate === "number"
        ? row.conversion_rate
        : computeConversionRate({
            views: row.views,
            likes: 0,
            comments: 0,
            clicks: row.clicks ?? 0,
            conversions: row.conversions,
            revenue: Number(row.revenue) || 0,
          });

    current.ctrs.push(ctr);
    current.cvrs.push(cvr);
    map.set(key, current);
  }

  const avg = (values: number[]) =>
    values.length === 0
      ? 0
      : Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  const avgFloat = (values: number[]) =>
    values.length === 0
      ? 0
      : Number(
          (
            values.reduce((a, b) => a + b, 0) / values.length
          ).toFixed(2)
        );

  return [...map.entries()]
    .map(([key, value]) => ({
      key,
      product_category: value.product_category,
      video_template: value.video_template,
      hook_type: value.hook_type,
      sample_count: value.scores.length,
      avg_intelligence_score: avg(value.scores),
      avg_views: avg(value.views),
      avg_conversions: avg(value.conversions),
      avg_revenue: avg(value.revenue),
      avg_ctr: avgFloat(value.ctrs),
      avg_cvr: avgFloat(value.cvrs),
    }))
    .sort(
      (a, b) =>
        b.avg_intelligence_score - a.avg_intelligence_score ||
        b.sample_count - a.sample_count
    );
}

/**
 * テンプレート選定用のボーナス（カテゴリ一致パターンから）。
 * 既存 selector に後から接続するための純関数。
 */
export function templateBonusFromInsights(
  insights: VideoPatternInsight[],
  input: { category?: string | null; templateId: string }
): number {
  const category = (input.category ?? "").toLowerCase();
  const matched = insights.filter(
    (item) =>
      item.video_template === input.templateId &&
      (!category || item.product_category.toLowerCase().includes(category))
  );

  if (matched.length === 0) return 0;

  const top = matched[0];
  // 最大 +20
  return Math.min(
    20,
    Math.round(top.avg_intelligence_score / 8) + Math.min(6, top.sample_count)
  );
}
