import type { DiscoverySeason } from "./types";

export function getCurrentSeason(date = new Date()): DiscoverySeason {
  const month = date.getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export function seasonLabel(season: DiscoverySeason): string {
  switch (season) {
    case "spring":
      return "春のトレンド";
    case "summer":
      return "夏のトレンド";
    case "autumn":
      return "秋のトレンド";
    case "winter":
      return "冬のトレンド";
  }
}
