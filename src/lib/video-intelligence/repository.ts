import { supabase } from "@/lib/supabase";
import {
  aggregatePatternInsights,
  scoreVideoPerformance,
} from "./scoring";
import type {
  SaveVideoPerformanceInput,
  VideoPatternInsight,
  VideoPerformanceMetrics,
  VideoPerformanceRecord,
} from "./types";

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

export function normalizeMetrics(
  input: Partial<VideoPerformanceMetrics> & { sales?: number }
): VideoPerformanceMetrics {
  return {
    views: toNonNegInt(input.views),
    likes: toNonNegInt(input.likes),
    comments: toNonNegInt(input.comments),
    clicks: toNonNegInt(input.clicks),
    conversions: toNonNegInt(
      input.conversions ?? input.sales
    ),
    revenue: toNonNegNumber(input.revenue),
  };
}

export async function saveVideoPerformance(
  input: SaveVideoPerformanceInput
): Promise<VideoPerformanceRecord> {
  if (!input.product_category?.trim()) {
    throw new Error("product_category は必須です");
  }
  if (!input.video_template?.toString().trim()) {
    throw new Error("video_template は必須です");
  }

  const metrics = normalizeMetrics(input);
  const scored = scoreVideoPerformance(metrics);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("video_performance")
    .insert([
      {
        product_id: input.product_id ?? null,
        product_performance_id: input.product_performance_id ?? null,
        product_category: input.product_category.trim(),
        video_template: String(input.video_template),
        hook_type: String(input.hook_type || "other"),
        views: metrics.views,
        likes: metrics.likes,
        comments: metrics.comments,
        clicks: metrics.clicks,
        conversions: metrics.conversions,
        revenue: metrics.revenue,
        intelligence_score: scored.total,
        engagement_rate: scored.engagement_rate,
        ctr: scored.ctr,
        conversion_rate: scored.conversion_rate,
        platform: input.platform?.trim() || "TikTok",
        video_url: input.video_url ?? null,
        notes: input.notes?.trim() || null,
        source: input.source ?? "manual",
        tiktok_video_id: input.tiktok_video_id ?? null,
        tiktok_snapshot: input.tiktok_snapshot ?? null,
        recorded_at: now,
        created_at: now,
        updated_at: now,
      },
    ])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as VideoPerformanceRecord;
}

export async function listVideoPerformance(options?: {
  limit?: number;
  category?: string;
  template?: string;
}): Promise<VideoPerformanceRecord[]> {
  const limit = Math.min(100, Math.max(1, options?.limit ?? 50));

  let query = supabase
    .from("video_performance")
    .select("*")
    .order("intelligence_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.category) {
    query = query.eq("product_category", options.category);
  }
  if (options?.template) {
    query = query.eq("video_template", options.template);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as VideoPerformanceRecord[];
}

export async function getVideoPerformanceById(
  id: string
): Promise<VideoPerformanceRecord | null> {
  const { data, error } = await supabase
    .from("video_performance")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as VideoPerformanceRecord | null) ?? null;
}

export async function listWinningPatterns(options?: {
  limit?: number;
  category?: string;
}): Promise<VideoPatternInsight[]> {
  const rows = await listVideoPerformance({
    limit: options?.limit ?? 100,
    category: options?.category,
  });

  return aggregatePatternInsights(rows);
}

/**
 * 商品分析・動画生成へ渡すための要約テキスト。
 * 既存 API 契約は変えず、prompt へ注入する。
 */
export function formatInsightsForPrompt(
  insights: VideoPatternInsight[],
  limit = 5
): string {
  if (insights.length === 0) {
    return "【動画インテリジェンス】蓄積データなし（一般的な短尺販売構成で作成）";
  }

  const top = insights.slice(0, limit);

  const popularTemplates = rankByFrequency(
    top.map((item) => item.video_template)
  );
  const bestHooks = [...top]
    .sort(
      (a, b) =>
        b.avg_cvr - a.avg_cvr ||
        b.avg_ctr - a.avg_ctr ||
        b.avg_intelligence_score - a.avg_intelligence_score
    )
    .slice(0, 5)
    .map((item) => item.hook_type);

  const avgCtr =
    top.reduce((sum, item) => sum + item.avg_ctr, 0) / top.length;
  const avgCvr =
    top.reduce((sum, item) => sum + item.avg_cvr, 0) / top.length;

  return [
    "【動画インテリジェンス：勝ちパターン】",
    "以下の実績データを優先して企画・フックを作成してください。",
    "",
    `人気テンプレート: ${popularTemplates.join(", ") || "なし"}`,
    `成績の良いフック: ${[...new Set(bestHooks)].join(", ") || "なし"}`,
    `平均CTR: ${avgCtr.toFixed(2)}%`,
    `平均CVR: ${avgCvr.toFixed(2)}%`,
    `成約率: ${avgCvr.toFixed(2)}%`,
    "",
    "詳細パターン:",
    ...top.map((item, index) =>
      [
        `${index + 1}. カテゴリ=${item.product_category} / テンプレート=${item.video_template} / フック=${item.hook_type}`,
        `   samples=${item.sample_count}, score=${item.avg_intelligence_score}, views≈${item.avg_views}, CTR=${item.avg_ctr}%, CVR(成約率)=${item.avg_cvr}%, 成約≈${item.avg_conversions}`,
      ].join("\n")
    ),
  ].join("\n");
}

function rankByFrequency(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value]) => value);
}

/**
 * generate-hook / generate-video 用。
 * 取得失敗時も空コンテキストを返し、既存APIを落とさない。
 */
export async function getWinningPatternPromptBlock(options?: {
  category?: string | null;
  limit?: number;
}): Promise<string> {
  try {
    const insights = await listWinningPatterns({
      limit: options?.limit ?? 40,
      category: options?.category?.trim() || undefined,
    });

    // カテゴリ指定で0件なら全体からフォールバック
    if (insights.length === 0 && options?.category) {
      const all = await listWinningPatterns({ limit: options?.limit ?? 40 });
      return formatInsightsForPrompt(all, 5);
    }

    return formatInsightsForPrompt(insights, 5);
  } catch (error) {
    console.error("VIDEO INTELLIGENCE PROMPT ERROR:", error);
    return "【動画インテリジェンス】取得失敗（一般的な短尺販売構成で作成）";
  }
}
