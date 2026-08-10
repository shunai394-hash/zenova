export type CreateSalesVideoInput = {
  product_name: string;
  description: string;
  target: string;
  platform?: string;
  /** raw base64 or data-url（image / image_base64 両対応は route 側） */
  image: string;
  /** Kling 尺（秒）。未指定時 5（短尺・課金/待ち時間を抑える） */
  duration_sec?: number;
  /**
   * カメラ動き・スタイル指定（任意）。
   * 未指定時は hook を motion として使う（既存どおり）。
   */
  motion?: string;
  /** 履歴表示用スタイルラベル（任意） */
  style?: string;
  /** 既存 products.id（任意）。あれば再利用 */
  product_id?: string;
  /** 商品URL（履歴の source_url） */
  source_url?: string;
  /** サムネイルURL（任意） */
  thumbnail_url?: string;
  /** usage / history 用 user_id */
  user_id?: string;
  /**
   * ユーザー編集のクリエイティブ上書き（任意）。
   * 指定時はシナリオ最適化後の hook / CTA / 台本に優先適用。
   */
  hook?: string;
  cta?: string;
  script?: string;
  hashtags?: string;
  /** 動画設定パネル: コンテンツスタイル ID（ugc / product_review 等） */
  video_style?: string;
  /** 動画タイプ（video_style と同義。クライアントから明示的に渡す） */
  video_type?: string;
  /** 話者: female | male | ai */
  speaker?: string;
  /** 字幕 ON/OFF（未指定時は true = 既存どおり） */
  captions_enabled?: boolean;
  /** BGM: trend | pop | cinematic | none */
  bgm?: string;
  /**
   * Free プラン時 true → composer でウォーターマーク + 720p
   * Starter 以上は false / 未指定（既存どおり）
   */
  watermark_required?: boolean;
  /**
   * 統一商品入力（任意）。指定時は欠落フィールドのフォールバックに使う。
   * @see ProductInput in @/lib/video-pipeline
   */
  productData?: import("@/lib/video-pipeline").ProductInput | null;
  /**
   * AI分析結果（任意）。hook / cta / score の補強に使う。
   * @see AnalysisResult in @/lib/video-pipeline
   */
  analysisResult?: import("@/lib/video-pipeline").AnalysisResult | null;
  /**
   * 動画企画（任意）。尺・スタイル・構成の補強に使う。
   * @see VideoPlan in @/lib/video-pipeline
   */
  videoPlan?: import("@/lib/video-pipeline").VideoPlan | null;
};

export type CreateSalesVideoSteps = {
  analysis: boolean;
  scenario: boolean;
  kling: boolean;
  narration: boolean;
  captions: boolean;
  evaluation: boolean;
  saved: boolean;
};

export type CreateSalesVideoResult = {
  success: boolean;
  product_id: string | null;
  scenario_id: string | null;
  video_id: string | null;
  video_url: string | null;
  audio_url: string | null;
  score: number;
  selling_angle: string;
  hook: string;
  steps: CreateSalesVideoSteps;
  warnings: string[];
  elapsed_ms: number;
  /** Free プランでウォーターマーク適用済みか */
  watermark_applied: boolean;
  /** デバッグ用（契約外でも可） */
  final_video_url?: string | null;
  remote_url?: string | null;
  provider?: string | null;
};
