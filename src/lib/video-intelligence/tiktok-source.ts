import type { TikTokVideoSnapshot } from "./types";

/**
 * TikTok 動画データ取得の接続ポイント。
 *
 * 将来の接続例:
 * - TikTok Research API / Display API
 * - TikTok Shop / Affiliate creative insights
 * - 自前クローラ
 *
 * 現状は未接続のため null を返す。
 */
export async function fetchTikTokVideoSnapshot(
  videoIdOrUrl: string | null | undefined
): Promise<TikTokVideoSnapshot | null> {
  if (!videoIdOrUrl?.trim()) return null;

  // TODO: 実API接続
  // const res = await fetch(`${process.env.TIKTOK_API_BASE}/video/query/`, ...)
  // return mapToSnapshot(await res.json())

  void videoIdOrUrl;
  return null;
}

export function emptyTikTokVideoSnapshot(
  overrides: Partial<TikTokVideoSnapshot> = {}
): TikTokVideoSnapshot {
  return {
    videoId: null,
    caption: null,
    authorId: null,
    authorName: null,
    createTime: null,
    durationSec: null,
    shareUrl: null,
    coverUrl: null,
    ...overrides,
  };
}
