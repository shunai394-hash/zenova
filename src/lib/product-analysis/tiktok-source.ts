import type { TikTokProductSnapshot } from "./types";

/**
 * TikTok Shop / Affiliate 商品データ取得の接続ポイント。
 *
 * 将来の接続例:
 * - TikTok Shop Open API
 * - Affiliate product catalog
 * - 自前クローラ / 商品URLパーサ
 *
 * 現状は未接続のため null を返す。
 */
export async function fetchTikTokProductSnapshot(
  productIdOrUrl: string | null | undefined
): Promise<TikTokProductSnapshot | null> {
  if (!productIdOrUrl?.trim()) return null;

  // TODO: 実API接続
  // const res = await fetch(`${process.env.TIKTOK_SHOP_API_BASE}/products/${id}`, ...)
  // return mapToSnapshot(await res.json())

  void productIdOrUrl;
  return null;
}

/** 手動入力 + 任意のTikTokスナップショットをマージする際のヘルパー */
export function emptyTikTokSnapshot(
  overrides: Partial<TikTokProductSnapshot> = {}
): TikTokProductSnapshot {
  return {
    productId: null,
    title: null,
    price: null,
    currency: null,
    commissionRate: null,
    salesCount: null,
    rating: null,
    shopName: null,
    category: null,
    productUrl: null,
    ...overrides,
  };
}
