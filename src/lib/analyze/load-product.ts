import { supabase } from "@/lib/supabase";
import { isProductAnalysis } from "@/lib/product-analysis";
import type { ProductAnalysis } from "@/lib/product-analysis";

export type AnalyzeLoadProduct = {
  id: string;
  product_name: string;
  description: string;
  target: string;
  platform: string;
  product_url: string | null;
  image_url: string | null;
  analysis: ProductAnalysis | null;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapRow(row: Record<string, unknown>): AnalyzeLoadProduct {
  const productName =
    asString(row.product_name).trim() ||
    asString(row.name).trim() ||
    "商品名なし";

  const description =
    asString(row.description).trim() ||
    asString(row.sell_reason).trim() ||
    "";

  const target = asString(row.target).trim() || "20〜30代の視聴者";
  const platform =
    asString(row.platform).trim() ||
    asString(row.best_platform).trim() ||
    "TikTok";

  const imageUrl =
    asString(row.image_url).trim() ||
    (asString(row.image_name).trim()
      ? `/generated/images/${asString(row.image_name).trim()}`
      : null);

  let analysis: ProductAnalysis | null = null;
  const raw = row.analysis;
  if (raw && typeof raw === "object" && isProductAnalysis(raw)) {
    analysis = raw;
  }

  return {
    id: asString(row.id),
    product_name: productName,
    description,
    target,
    platform,
    product_url: asString(row.product_url).trim() || null,
    image_url: imageUrl,
    analysis,
  };
}

/**
 * analyze?id=... 用: products テーブルから商品を取得してフォームへ流し込む。
 */
export async function getProductForAnalyze(
  id: string
): Promise<AnalyzeLoadProduct | null> {
  const fullSelect =
    "id, product_name, name, description, target, platform, product_url, image_url, image_name, sell_reason, best_platform, analysis";
  const baseSelect =
    "id, product_name, name, description, target, platform, product_url, image_url, image_name, analysis";

  let result = await supabase
    .from("products")
    .select(fullSelect)
    .eq("id", id)
    .maybeSingle();

  if (
    result.error &&
    /sell_reason|best_platform|column|schema cache/i.test(result.error.message)
  ) {
    result = await supabase
      .from("products")
      .select(baseSelect)
      .eq("id", id)
      .maybeSingle();
  }

  if (result.error) {
    throw new Error(result.error.message);
  }
  if (!result.data) return null;

  return mapRow(result.data as Record<string, unknown>);
}
