export type ComposeVideoInput = {
  video_url: string;
  audio_url?: string | null;
  bgm_url?: string | null;
  narration_script?: string | null;
  subtitle_file?: string | null;
  burn_captions?: boolean;
  watermark_required?: boolean;
};

export type ComposeVideoResult = {
  final_video_url: string;
  audio_merged: boolean;
  bgm_merged: boolean;
  captions_burned: boolean;
  watermark_applied: boolean;
  subtitle_file: string | null;
  filename: string;
  bytes: number;
  video_url: string;
  audio_url: string | null;
  bgm_url: string | null;
  narration_script: string | null;
  skipped: boolean;
  skip_reason: string | null;
};
