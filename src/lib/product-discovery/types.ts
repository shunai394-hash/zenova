export type DiscoveryProduct = {
  id: string;
  name: string;
  image_url: string | null;
  price: number | null;
  affiliate_rate: number | null;
  estimated_profit: number | null;
  sales_score: number | null;
  sell_reason: string | null;
  trend_direction: string | null;
  competition_level: string | null;
  best_platform: string | null;
  is_featured: boolean;
  season: string | null;
  category: string | null;
};

export type DiscoverySeason = "spring" | "summer" | "autumn" | "winter";

export type DiscoveryPayload = {
  featured: DiscoveryProduct[];
  high_reward: DiscoveryProduct[];
  seasonal: DiscoveryProduct[];
  season: DiscoverySeason;
  season_label: string;
  supabase_ok: boolean;
  warnings: string[];
};
