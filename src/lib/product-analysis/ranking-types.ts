import type { ProductListItem } from "./product-record";

export type RankingProduct = ProductListItem & {
  rank: number;
  category: string;
  sales_angle: string | null;
};

export type CategoryStat = {
  category: string;
  count: number;
  avg_score: number;
  top_product_name: string | null;
};

export type SalesAngleStat = {
  angle: string;
  count: number;
  avg_score: number;
};

export type ProductRankingPayload = {
  ranking: RankingProduct[];
  categories: CategoryStat[];
  popular_angles: SalesAngleStat[];
  total_analyzed: number;
};
