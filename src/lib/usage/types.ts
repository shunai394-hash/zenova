export type PlanRecord = {
  id: string;
  name: string;
  price: number;
  video_limit: number;
  image_limit: number;
  analysis_limit: number;
  created_at: string;
};

export type UserSubscriptionRecord = {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  period_start: string;
  period_end: string;
  created_at: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type UsageLogRecord = {
  id: string;
  user_id: string;
  usage_type: string;
  amount: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type VideoCreditRecord = {
  id: string;
  user_id: string;
  credits: number;
  source: string;
  created_at: string;
};

export type UsageType = "video" | "image" | "analysis";

export type UsageSummary = {
  plan: string;
  video_limit: number;
  used: number;
  remaining: number;
  extra_credit: number;
};

export type VideoLimitCheck = UsageSummary & {
  allowed: boolean;
  reason: string | null;
  /** 利用管理テーブル未整備などでチェック不能 → 既存機能を止めない */
  bypassed: boolean;
};

export type SetUserPlanOptions = {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  status?: string;
  metadata?: Record<string, unknown>;
};

/** 認証未導入時のデフォルト利用者（固定 UUID）— 本番課金では Auth ユーザーを優先 */
export const DEFAULT_USAGE_USER_ID =
  "00000000-0000-4000-8000-000000000001";
