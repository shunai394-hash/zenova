import type { ProductAnalysis } from "@/lib/product-analysis";
import type { ProductInput, ProductSource } from "./types";

function inferPlatformFromUrl(url: string | null | undefined): string | null {
  const u = (url || "").toLowerCase();
  if (!u) return null;
  if (u.includes("amazon.")) return "amazon";
  if (u.includes("rakuten.")) return "rakuten";
  if (u.includes("tiktok.com") || u.includes("shop.tiktok")) {
    return "tiktok_shop";
  }
  return "other";
}

/**
 * フォーム / 分析結果から ProductInput を組み立てる。
 * Amazon・楽天・TikTok Shop 接続時は source 別パーサーを追加する。
 */
export function buildProductInput(input: {
  id?: string | null;
  name: string;
  image?: string | null;
  url?: string | null;
  description: string;
  category?: string | null;
  target?: string;
  selling_points?: string[];
  source?: ProductSource;
  sourceUrl?: string | null;
  platform?: string | null;
  analysis?: ProductAnalysis | null;
}): ProductInput {
  const analysis = input.analysis ?? null;
  const selling =
    input.selling_points?.filter(Boolean) ??
    analysis?.sellingPoints?.filter(Boolean) ??
    [];

  const url =
    input.url?.trim() ||
    input.sourceUrl?.trim() ||
    analysis?.productUrl ||
    null;
  const source = input.source ?? inferProductSource({ ...input, url });
  const platform =
    input.platform?.trim() ||
    inferPlatformFromUrl(url) ||
    (source === "amazon" ||
    source === "rakuten" ||
    source === "tiktok_shop"
      ? source
      : null);

  return {
    id: input.id?.trim() || null,
    name: input.name.trim() || analysis?.productName || "未命名商品",
    image: input.image?.trim() || null,
    url,
    description: input.description.trim() || analysis?.summary || "",
    category: input.category?.trim() || null,
    target:
      input.target?.trim() ||
      analysis?.targetInsight?.trim() ||
      analysis?.buyerPersona?.trim() ||
      "",
    selling_points: selling.slice(0, 8),
    source,
    sourceUrl: url,
    platform,
  };
}

function inferProductSource(input: {
  url?: string | null;
  image?: string | null;
  source?: ProductSource;
}): ProductSource {
  if (input.source) return input.source;
  const url = (input.url || "").toLowerCase();
  if (url.includes("amazon.")) return "amazon";
  if (url.includes("rakuten.")) return "rakuten";
  if (url.includes("tiktok.com") || url.includes("shop.tiktok")) {
    return "tiktok_shop";
  }
  if (url.trim()) return "url";
  if (input.image) return "image";
  return "manual";
}

/** API / 履歴向けにフラット化 */
export function productInputToApiFields(product: ProductInput) {
  return {
    product_name: product.name,
    description: product.description,
    target: product.target,
    product_id: product.id || undefined,
    source_url: product.sourceUrl || product.url || undefined,
    thumbnail_url: product.image || undefined,
    platform: product.platform || undefined,
  };
}
