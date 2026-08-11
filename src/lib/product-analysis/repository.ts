import { supabase } from "@/lib/supabase";
import type {
  CategoryStat,
  ProductRankingPayload,
  RankingProduct,
  SalesAngleStat,
} from "./ranking-types";
import type {
  ProductListItem,
  ProductRecord,
  SaveProductInput,
} from "./product-record";
import type { ProductAnalysis } from "./types";

const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  {
    category: "ビューティー",
    keywords: ["美容", "美顔", "スキン", "コスメ", "マスク", "クリーム", "化粧水"],
  },
  {
    category: "ガジェット",
    keywords: [
      "イヤホン",
      "ワイヤレス",
      "充電",
      "スマホ",
      "ガジェット",
      "カメラ",
      "スピーカー",
    ],
  },
  {
    category: "季節家電",
    keywords: ["クーラー", "ファン", "ヒーター", "加湿器", "除湿", "扇風機"],
  },
  {
    category: "ヘルスケア",
    keywords: ["サプリ", "健康", "ダイエット", "睡眠", "マッサージ", "ストレッチ"],
  },
  {
    category: "ライフスタイル",
    keywords: ["収納", "キッチン", "掃除", "便利", "時短", "デスク", "バッグ"],
  },
  {
    category: "ファッション",
    keywords: ["服", "靴", "アパレル", "ウェア", "ジャケット", "パンツ"],
  },
];

function toListItem(row: ProductRecord): ProductListItem {
  const analysis = row.analysis;
  return {
    id: row.id,
    product_name: row.product_name,
    platform: row.platform,
    target: row.target,
    product_url: row.product_url,
    sales_score: row.sales_score,
    sales_grade: row.sales_grade,
    source: row.source,
    summary:
      typeof analysis?.summary === "string"
        ? analysis.summary
        : row.product_name,
    created_at: row.created_at,
  };
}

export function inferProductCategory(
  productName: string,
  description = "",
  analysis?: ProductAnalysis | null
): string {
  const tiktokCategory = analysis?.tiktok?.category?.trim();
  if (tiktokCategory) return tiktokCategory;

  const haystack = `${productName} ${description}`.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
      return rule.category;
    }
  }

  return "その他";
}

function extractSalesAngle(row: ProductRecord): string | null {
  const angle = row.analysis?.salesAngle;
  return typeof angle === "string" && angle.trim() ? angle.trim() : null;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length
  );
}

export async function saveProductAnalysis(
  input: SaveProductInput
): Promise<ProductRecord> {
  const now = new Date().toISOString();
  const category = inferProductCategory(
    input.product_name,
    input.description,
    input.analysis
  );
  const imageUrl = input.image_name?.trim()
    ? `/generated/images/${input.image_name.trim()}`
    : null;

  const baseRow = {
    product_name: input.product_name,
    description: input.description,
    target: input.target,
    platform: input.platform,
    product_url: input.product_url ?? null,
    image_name: input.image_name ?? null,
    analysis: input.analysis,
    sales_score: input.analysis.salesScore?.total ?? null,
    sales_grade: input.analysis.salesScore?.grade ?? null,
    source: input.analysis.source ?? null,
    created_at: now,
    updated_at: now,
  };

  const extendedRow = {
    ...baseRow,
    name: input.product_name,
    category,
    image_url: imageUrl,
  };

  let { data, error } = await supabase
    .from("products")
    .insert([extendedRow])
    .select("*")
    .single();

  // migration 未適用で name/category/image_url が無い場合は既存列のみで再試行
  if (error && /name|category|image_url|schema cache|column/i.test(error.message)) {
    const retry = await supabase
      .from("products")
      .insert([baseRow])
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  return data as ProductRecord;
}

export async function listRecentProducts(
  limit = 12
): Promise<ProductListItem[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProductRecord[]).map(toListItem);
}

export async function getProductById(
  id: string
): Promise<ProductRecord | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ProductRecord | null) ?? null;
}

/** 販売スコア降順で商品を取得 */
export async function listProductsBySalesScore(
  limit = 20
): Promise<ProductRecord[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sales_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProductRecord[];
}

export async function getProductRanking(
  limit = 10
): Promise<ProductRankingPayload> {
  // 集計用に広めに取得し、ランキング表示は limit 件
  const rows = await listProductsBySalesScore(Math.max(limit, 100));

  const ranking: RankingProduct[] = rows.slice(0, limit).map((row, index) => {
    const item = toListItem(row);
    return {
      ...item,
      rank: index + 1,
      category: inferProductCategory(
        row.product_name,
        row.description,
        row.analysis
      ),
      sales_angle: extractSalesAngle(row),
    };
  });

  const categoryMap = new Map<
    string,
    { scores: number[]; topName: string | null; topScore: number }
  >();

  for (const row of rows) {
    const category = inferProductCategory(
      row.product_name,
      row.description,
      row.analysis
    );
    const score = row.sales_score ?? 0;
    const current = categoryMap.get(category) ?? {
      scores: [],
      topName: null,
      topScore: -1,
    };
    current.scores.push(score);
    if (score > current.topScore) {
      current.topScore = score;
      current.topName = row.product_name;
    }
    categoryMap.set(category, current);
  }

  const categories: CategoryStat[] = [...categoryMap.entries()]
    .map(([category, value]) => ({
      category,
      count: value.scores.length,
      avg_score: average(value.scores),
      top_product_name: value.topName,
    }))
    .sort((a, b) => b.count - a.count || b.avg_score - a.avg_score);

  const angleMap = new Map<string, number[]>();

  for (const row of rows) {
    const angle = extractSalesAngle(row);
    if (!angle) continue;
    const scores = angleMap.get(angle) ?? [];
    scores.push(row.sales_score ?? 0);
    angleMap.set(angle, scores);
  }

  const popular_angles: SalesAngleStat[] = [...angleMap.entries()]
    .map(([angle, scores]) => ({
      angle,
      count: scores.length,
      avg_score: average(scores),
    }))
    .sort((a, b) => b.count - a.count || b.avg_score - a.avg_score)
    .slice(0, 8);

  return {
    ranking,
    categories,
    popular_angles,
    total_analyzed: rows.length,
  };
}

export function isProductAnalysis(
  value: unknown
): value is ProductAnalysis {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.productName === "string" &&
    typeof obj.summary === "string" &&
    obj.salesScore !== undefined &&
    typeof obj.salesScore === "object"
  );
}
