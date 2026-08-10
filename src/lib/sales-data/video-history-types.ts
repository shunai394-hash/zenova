export type GeneratedVideoHistoryItem = {
  id: string;
  user_id: string | null;
  product_id: string;
  product_name: string;
  source_url: string | null;
  video_url: string;
  thumbnail_url: string | null;
  script: string | null;
  hook: string;
  style: string | null;
  status: string;
  selling_angle: string;
  score: number | null;
  /** 投稿前AIマーケ診断（カラム追加後に返却） */
  marketing_score?: number | null;
  hook_score?: number | null;
  conversion_score?: number | null;
  ai_feedback?: string | null;
  /** 改善ループ（DBカラム追加後） */
  previous_score?: number | null;
  after_score?: number | null;
  improvement_reason?: string | null;
  next_video_plan?: string | null;
  post_status?: string | null;
  created_at: string;
  updated_at: string;
  /** 再生成用（任意） */
  description: string;
  target: string;
  platform: string;
  image_url: string | null;
};

export type GeneratedVideoHistoryPayload = {
  videos: GeneratedVideoHistoryItem[];
  supabase_ok: boolean;
  warnings: string[];
};
