import type { VideoTemplateId } from "@/lib/video-template";

/** データ取得元 */
export type VideoIntelligenceSource =
  | "manual"
  | "product_performance"
  | "tiktok_api"
  | "import";

/** フック種類（分析・生成で共有） */
export type HookType =
  | "problem"
  | "curiosity"
  | "social_proof"
  | "before_after"
  | "question"
  | "shock"
  | "benefit"
  | "other";

/** 将来 TikTok API から取り込む動画スナップショット */
export type TikTokVideoSnapshot = {
  videoId: string | null;
  caption: string | null;
  authorId: string | null;
  authorName: string | null;
  createTime: string | null;
  durationSec: number | null;
  shareUrl: string | null;
  coverUrl: string | null;
  raw?: Record<string, unknown>;
};

export type VideoPerformanceMetrics = {
  views: number;
  likes: number;
  comments: number;
  clicks: number;
  /** 成約 */
  conversions: number;
  /** 売上 */
  revenue: number;
};

export type VideoPerformanceRecord = VideoPerformanceMetrics & {
  id: string;
  product_id: string | null;
  product_performance_id: string | null;
  product_category: string;
  video_template: VideoTemplateId | string;
  hook_type: HookType | string;
  intelligence_score: number | null;
  engagement_rate: number | null;
  ctr: number | null;
  conversion_rate: number | null;
  platform: string;
  video_url: string | null;
  notes: string | null;
  source: VideoIntelligenceSource | string;
  tiktok_video_id: string | null;
  tiktok_snapshot: TikTokVideoSnapshot | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
};

export type SaveVideoPerformanceInput = {
  product_id?: string | null;
  product_performance_id?: string | null;
  product_category: string;
  video_template: VideoTemplateId | string;
  hook_type: HookType | string;
  views?: number;
  likes?: number;
  comments?: number;
  clicks?: number;
  conversions?: number;
  /** 別名: 成約（UI互換） */
  sales?: number;
  revenue?: number;
  platform?: string;
  video_url?: string | null;
  notes?: string | null;
  source?: VideoIntelligenceSource;
  tiktok_video_id?: string | null;
  tiktok_snapshot?: TikTokVideoSnapshot | null;
};

export type VideoPatternInsight = {
  key: string;
  product_category: string;
  video_template: string;
  hook_type: string;
  sample_count: number;
  avg_intelligence_score: number;
  avg_views: number;
  avg_conversions: number;
  avg_revenue: number;
  /** 平均CTR（%） */
  avg_ctr: number;
  /** 平均CVR / 成約率（%） */
  avg_cvr: number;
};

export type VideoIntelligenceScore = {
  total: number;
  engagement_rate: number;
  ctr: number;
  conversion_rate: number;
  grade: "S" | "A" | "B" | "C" | "D";
  label: string;
  tips: string[];
};
