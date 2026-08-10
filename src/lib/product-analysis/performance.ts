import { supabase } from "@/lib/supabase";
import type {
  PerformanceAdjustedScore,
  ProductPerformanceMetrics,
  ProductPerformanceRecord,
  UpsertProductPerformanceInput,
} from "./performance-types";
import type { SalesScore } from "./types";

function toNonNegInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function toNonNegNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export function normalizePerformanceMetrics(
  input: Partial<ProductPerformanceMetrics> | null | undefined
): ProductPerformanceMetrics {
  return {
    views: toNonNegInt(input?.views),
    likes: toNonNegInt(input?.likes),
    comments: toNonNegInt(input?.comments),
    clicks: toNonNegInt(input?.clicks),
    sales: toNonNegInt(input?.sales),
    revenue: toNonNegNumber(input?.revenue),
  };
}

/** 実績から販売スコアへの加点（0〜25） */
export function computePerformanceBonus(
  metrics: ProductPerformanceMetrics | null | undefined
): number {
  if (!metrics) return 0;

  const views = Math.max(0, metrics.views);
  const likes = Math.max(0, metrics.likes);
  const comments = Math.max(0, metrics.comments);
  const clicks = Math.max(0, metrics.clicks);
  const sales = Math.max(0, metrics.sales);

  const engagementRate =
    views > 0 ? ((likes + comments * 2) / views) * 100 : 0;
  const ctr = views > 0 ? (clicks / views) * 100 : 0;
  const cvr = clicks > 0 ? (sales / clicks) * 100 : sales > 0 ? 20 : 0;

  let bonus = 0;
  bonus += Math.min(8, Math.log10(views + 1) * 2.5);
  bonus += Math.min(6, engagementRate * 0.8);
  bonus += Math.min(6, ctr * 1.2);
  bonus += Math.min(5, cvr * 0.5);
  bonus += Math.min(4, sales * 1.5);

  return Math.max(0, Math.min(25, Math.round(bonus)));
}

export function applyPerformanceToSalesScore(
  base: SalesScore,
  metrics: ProductPerformanceMetrics | null | undefined
): { score: SalesScore; adjusted: PerformanceAdjustedScore } {
  const bonus = computePerformanceBonus(metrics);
  const views = metrics?.views ?? 0;
  const likes = metrics?.likes ?? 0;
  const comments = metrics?.comments ?? 0;
  const clicks = metrics?.clicks ?? 0;
  const sales = metrics?.sales ?? 0;

  const adjustedTotal = Math.max(
    0,
    Math.min(100, Math.round(base.total + bonus))
  );

  const grade =
    adjustedTotal >= 90
      ? "S"
      : adjustedTotal >= 80
        ? "A"
        : adjustedTotal >= 65
          ? "B"
          : adjustedTotal >= 50
            ? "C"
            : "D";

  const labelMap = {
    S: "非常に売りやすい",
    A: "売りやすい",
    B: "標準的に売れる",
    C: "訴求の磨き込みが必要",
    D: "情報不足 / 再設計推奨",
  } as const;

  const tips = [...base.tips];
  if (bonus > 0) {
    tips.unshift(`実績ボーナス +${bonus}（動画成果を反映）`);
  } else if (!metrics || views === 0) {
    tips.push("動画公開後に閲覧・クリック・売上を記録するとスコアが精緻化されます");
  }

  const baseBreakdown = base.baseBreakdown ?? base.breakdown;

  const score: SalesScore = {
    ...base,
    total: adjustedTotal,
    grade,
    label: labelMap[grade],
    baseTotal: base.baseTotal ?? base.total,
    baseBreakdown: { ...baseBreakdown },
    performanceBonus: bonus,
    breakdown: {
      ...baseBreakdown,
      // 実績は需要適合・成約準備に反映
      demandFit: Math.min(
        100,
        baseBreakdown.demandFit + Math.round(bonus * 0.4)
      ),
      conversionReadiness: Math.min(
        100,
        baseBreakdown.conversionReadiness + Math.round(bonus * 0.6)
      ),
    },
    tips: tips.slice(0, 5),
  };

  const adjusted: PerformanceAdjustedScore = {
    base_total: base.total,
    adjusted_total: adjustedTotal,
    performance_bonus: bonus,
    engagement_rate: views > 0 ? ((likes + comments * 2) / views) * 100 : null,
    ctr: views > 0 ? (clicks / views) * 100 : null,
    conversion_rate: clicks > 0 ? (sales / clicks) * 100 : null,
  };

  return { score, adjusted };
}

export async function getPerformanceByProductId(
  productId: string
): Promise<ProductPerformanceRecord | null> {
  const { data, error } = await supabase
    .from("product_performance")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ProductPerformanceRecord | null) ?? null;
}

export async function upsertProductPerformance(
  input: UpsertProductPerformanceInput
): Promise<ProductPerformanceRecord> {
  if (!input.product_id?.trim()) {
    throw new Error("product_id は必須です");
  }

  const metrics = normalizePerformanceMetrics(input);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("product_performance")
    .upsert(
      {
        product_id: input.product_id,
        views: metrics.views,
        likes: metrics.likes,
        comments: metrics.comments,
        clicks: metrics.clicks,
        sales: metrics.sales,
        revenue: metrics.revenue,
        notes: input.notes?.trim() || null,
        recorded_at: now,
        updated_at: now,
      },
      { onConflict: "product_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProductPerformanceRecord;
}

export async function listPerformanceByProductIds(
  productIds: string[]
): Promise<ProductPerformanceRecord[]> {
  if (productIds.length === 0) return [];

  const { data, error } = await supabase
    .from("product_performance")
    .select("*")
    .in("product_id", productIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProductPerformanceRecord[];
}
