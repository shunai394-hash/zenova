/** DB の affiliate_rate は比率（0.20 = 20%）。表示用にパーセントへ変換。 */
export function formatAffiliateRatePercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  // 1以下は比率、1超はすでにパーセント値とみなす（DBは変更しない）
  const percent = value <= 1 ? value * 100 : value;
  const rounded = Math.round(percent * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded}%`;
}

const CATEGORY_EMOJI: Record<string, string> = {
  ガジェット: "📱",
  キッチン: "🍳",
  ファッション: "👗",
  生活家電: "🏠",
  ビューティー: "✨",
  ヘルスケア: "💪",
};

export function formatCategoryBadge(category: string | null): string | null {
  const raw = category?.trim();
  if (!raw) return null;
  const emoji = CATEGORY_EMOJI[raw] ?? "🏷️";
  return `${emoji} ${raw}`;
}

/** 商品名末尾にカテゴリが連結されている場合は分離して表示用に整える */
export function splitNameAndCategory(
  name: string,
  category: string | null
): { name: string; category: string | null } {
  const cat = category?.trim() || null;
  let displayName = name.trim();
  if (cat && displayName.endsWith(cat)) {
    displayName = displayName.slice(0, -cat.length).trim();
  }
  return { name: displayName || name, category: cat };
}
