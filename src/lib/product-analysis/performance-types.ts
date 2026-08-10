export type ProductPerformanceMetrics = {
  views: number;
  likes: number;
  comments: number;
  clicks: number;
  /** 成約件数 */
  sales: number;
  /** 売上金額 */
  revenue: number;
};

export type ProductPerformanceRecord = ProductPerformanceMetrics & {
  id: string;
  product_id: string;
  notes: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
};

export type UpsertProductPerformanceInput = {
  product_id: string;
  views?: number;
  likes?: number;
  comments?: number;
  clicks?: number;
  sales?: number;
  revenue?: number;
  notes?: string | null;
};

export type PerformanceAdjustedScore = {
  base_total: number;
  adjusted_total: number;
  performance_bonus: number;
  engagement_rate: number | null;
  ctr: number | null;
  conversion_rate: number | null;
};
