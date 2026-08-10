export type ComposeVideoInput = {
  video_url: string;
  audio_url?: string | null;
  narration_script?: string | null;
  /** /generated/subtitles/*.ass など（任意） */
  subtitle_file?: string | null;
  /** true のとき subtitle_file を焼き込み（デフォルト: subtitle_file があれば true） */
  burn_captions?: boolean;
  /**
   * Free プラン向け: ZENOVA ウォーターマーク焼き込み + 720p スケール
   * Starter 以上は false / 未指定のまま（既存動作）
   */
  watermark_required?: boolean;
};

export type ComposeVideoResult = {
  final_video_url: string;
  audio_merged: boolean;
  captions_burned: boolean;
  watermark_applied: boolean;
  subtitle_file: string | null;
  filename: string;
  bytes: number;
  video_url: string;
  audio_url: string | null;
  narration_script: string | null;
  skipped: boolean;
  skip_reason: string | null;
};
