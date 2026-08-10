export type DashboardVideoScoreItem = {
  id: string;
  product_id: string;
  product_name: string | null;
  video_url: string;
  audio_url: string | null;
  score: number | null;
  hook_score: number | null;
  product_score: number | null;
  cta_score: number | null;
  tiktok_score: number | null;
  created_at: string;
};

export type DashboardProductItem = {
  id: string;
  product_name: string;
  name: string | null;
  category: string | null;
  description: string;
  image_url: string | null;
  sales_score: number | null;
  sales_grade: string | null;
  summary: string;
  sales_angle: string | null;
  platform: string;
  created_at: string;
};

export type DashboardRankingItem = {
  rank: number;
  id: string;
  product_name: string;
  category: string;
  sales_score: number | null;
  sales_grade: string | null;
  sales_angle: string | null;
};

export type DashboardPayload = {
  totals: {
    products: number;
    analyses: number;
    generated_videos: number;
    sales_scenarios: number;
  };
  ranking: DashboardRankingItem[];
  recent_products: DashboardProductItem[];
  video_scores: DashboardVideoScoreItem[];
  spotlight: DashboardRankingItem[];
  categories: Array<{
    category: string;
    count: number;
    avg_score: number;
    top_product_name: string | null;
  }>;
  popular_angles: Array<{
    angle: string;
    count: number;
    avg_score: number;
  }>;
  supabase_ok: boolean;
  warnings: string[];
};
