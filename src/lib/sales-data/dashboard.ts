import { supabase } from "@/lib/supabase";
import { inferProductCategory } from "@/lib/product-analysis/repository";
import type {
  DashboardPayload,
  DashboardProductItem,
  DashboardRankingItem,
  DashboardVideoScoreItem,
} from "./dashboard-types";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function emptyPayload(warnings: string[] = []): DashboardPayload {
  return {
    totals: {
      products: 0,
      analyses: 0,
      generated_videos: 0,
      sales_scenarios: 0,
    },
    ranking: [],
    recent_products: [],
    video_scores: [],
    spotlight: [],
    categories: [],
    popular_angles: [],
    supabase_ok: false,
    warnings,
  };
}

function toProductItem(row: Record<string, unknown>): DashboardProductItem {
  const analysis =
    row.analysis && typeof row.analysis === "object"
      ? (row.analysis as Record<string, unknown>)
      : null;
  const productName =
    asString(row.product_name) || asString(row.name) || "無名の商品";
  const summary =
    typeof analysis?.summary === "string" && analysis.summary.trim()
      ? analysis.summary.trim()
      : productName;
  const salesAngle =
    typeof analysis?.salesAngle === "string" && analysis.salesAngle.trim()
      ? analysis.salesAngle.trim()
      : null;
  const category =
    asString(row.category) ||
    inferProductCategory(
      productName,
      asString(row.description),
      analysis as never
    );

  return {
    id: String(row.id),
    product_name: productName,
    name: asString(row.name) || null,
    category,
    description: asString(row.description),
    image_url: asString(row.image_url) || null,
    sales_score:
      typeof row.sales_score === "number" ? row.sales_score : null,
    sales_grade: asString(row.sales_grade) || null,
    summary,
    sales_angle: salesAngle,
    platform: asString(row.platform) || "TikTok",
    created_at: asString(row.created_at) || new Date().toISOString(),
  };
}

function buildCategories(
  products: DashboardProductItem[]
): DashboardPayload["categories"] {
  const map = new Map<
    string,
    { count: number; scores: number[]; top: DashboardProductItem | null }
  >();

  for (const p of products) {
    const key = p.category || "その他";
    const cur = map.get(key) ?? { count: 0, scores: [], top: null };
    cur.count += 1;
    if (typeof p.sales_score === "number") cur.scores.push(p.sales_score);
    if (
      !cur.top ||
      (p.sales_score ?? -1) > (cur.top.sales_score ?? -1)
    ) {
      cur.top = p;
    }
    map.set(key, cur);
  }

  return Array.from(map.entries())
    .map(([category, value]) => ({
      category,
      count: value.count,
      avg_score:
        value.scores.length === 0
          ? 0
          : Math.round(
              value.scores.reduce((a, b) => a + b, 0) / value.scores.length
            ),
      top_product_name: value.top?.product_name ?? null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function buildPopularAngles(
  products: DashboardProductItem[]
): DashboardPayload["popular_angles"] {
  const map = new Map<string, { count: number; scores: number[] }>();
  for (const p of products) {
    if (!p.sales_angle) continue;
    const cur = map.get(p.sales_angle) ?? { count: 0, scores: [] };
    cur.count += 1;
    if (typeof p.sales_score === "number") cur.scores.push(p.sales_score);
    map.set(p.sales_angle, cur);
  }

  return Array.from(map.entries())
    .map(([angle, value]) => ({
      angle,
      count: value.count,
      avg_score:
        value.scores.length === 0
          ? 0
          : Math.round(
              value.scores.reduce((a, b) => a + b, 0) / value.scores.length
            ),
    }))
    .sort((a, b) => b.count - a.count || b.avg_score - a.avg_score)
    .slice(0, 6);
}

/**
 * Dashboard 用に products / sales_scenarios / generated_videos を集計。
 * 一部テーブル失敗でも空配列で継続（画面を壊さない）。
 */
export async function getSalesDashboard(input?: {
  recentLimit?: number;
  rankingLimit?: number;
  videoLimit?: number;
}): Promise<DashboardPayload> {
  const recentLimit = Math.min(24, Math.max(1, input?.recentLimit ?? 12));
  const rankingLimit = Math.min(30, Math.max(1, input?.rankingLimit ?? 10));
  const videoLimit = Math.min(30, Math.max(1, input?.videoLimit ?? 12));
  const warnings: string[] = [];

  let productRows: Record<string, unknown>[] = [];
  let scenarioCount = 0;
  let videoRows: Record<string, unknown>[] = [];
  const productNameById = new Map<string, string>();

  try {
    const { data, error, count } = await supabase
      .from("products")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      warnings.push(`products: ${error.message}`);
    } else {
      productRows = (data ?? []) as Record<string, unknown>[];
      // count が取れない場合は取得件数で代替
      void count;
    }
  } catch (error) {
    warnings.push(
      `products: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const products = productRows.map(toProductItem);
  for (const p of products) {
    productNameById.set(p.id, p.product_name);
  }

  let productsTotal = products.length;
  try {
    const { count, error } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });
    if (!error && typeof count === "number") {
      productsTotal = count;
    }
  } catch {
    /* ignore */
  }

  try {
    const { count, error } = await supabase
      .from("sales_scenarios")
      .select("id", { count: "exact", head: true });
    if (error) {
      warnings.push(`sales_scenarios: ${error.message}`);
    } else {
      scenarioCount = count ?? 0;
    }
  } catch (error) {
    warnings.push(
      `sales_scenarios: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  try {
    const { data, error } = await supabase
      .from("generated_videos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(videoLimit);

    if (error) {
      warnings.push(`generated_videos: ${error.message}`);
    } else {
      videoRows = (data ?? []) as Record<string, unknown>[];
    }
  } catch (error) {
    warnings.push(
      `generated_videos: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  let videosTotal = videoRows.length;
  try {
    const { count, error } = await supabase
      .from("generated_videos")
      .select("id", { count: "exact", head: true });
    if (!error && typeof count === "number") {
      videosTotal = count;
    }
  } catch {
    /* ignore */
  }

  // 足りない商品名を補完
  const missingIds = Array.from(
    new Set(
      videoRows
        .map((v) => String(v.product_id ?? ""))
        .filter((id) => id && !productNameById.has(id))
    )
  );
  if (missingIds.length > 0) {
    try {
      const { data } = await supabase
        .from("products")
        .select("id, product_name, name")
        .in("id", missingIds);
      for (const row of data ?? []) {
        const name =
          asString((row as { product_name?: string }).product_name) ||
          asString((row as { name?: string }).name);
        if (name) productNameById.set(String((row as { id: string }).id), name);
      }
    } catch {
      /* ignore */
    }
  }

  const rankedSource = [...products].sort(
    (a, b) => (b.sales_score ?? -1) - (a.sales_score ?? -1)
  );
  const ranking: DashboardRankingItem[] = rankedSource
    .slice(0, rankingLimit)
    .map((p, index) => ({
      rank: index + 1,
      id: p.id,
      product_name: p.product_name,
      category: p.category || "その他",
      sales_score: p.sales_score,
      sales_grade: p.sales_grade,
      sales_angle: p.sales_angle,
    }));

  const video_scores: DashboardVideoScoreItem[] = videoRows.map((row) => {
    const productId = String(row.product_id ?? "");
    return {
      id: String(row.id),
      product_id: productId,
      product_name: productNameById.get(productId) ?? null,
      video_url: asString(row.video_url),
      audio_url: asString(row.audio_url) || null,
      score: typeof row.score === "number" ? row.score : null,
      hook_score: typeof row.hook_score === "number" ? row.hook_score : null,
      product_score:
        typeof row.product_score === "number" ? row.product_score : null,
      cta_score: typeof row.cta_score === "number" ? row.cta_score : null,
      tiktok_score:
        typeof row.tiktok_score === "number" ? row.tiktok_score : null,
      created_at: asString(row.created_at) || new Date().toISOString(),
    };
  });

  const supabaseOk = warnings.length === 0;

  return {
    totals: {
      products: productsTotal,
      analyses: productsTotal,
      generated_videos: videosTotal,
      sales_scenarios: scenarioCount,
    },
    ranking,
    recent_products: products.slice(0, recentLimit),
    video_scores,
    spotlight: ranking.slice(0, 3),
    categories: buildCategories(products),
    popular_angles: buildPopularAngles(products),
    supabase_ok: supabaseOk,
    warnings,
  };
}

export function getEmptySalesDashboard(): DashboardPayload {
  return emptyPayload();
}
