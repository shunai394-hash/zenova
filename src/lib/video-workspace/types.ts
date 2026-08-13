export type WorkspaceVisualSource = "uploaded_video" | "kling" | "luma" | "still_image";

export type WorkspaceVideoInput = {
  script: string;
  captionsOn: boolean;
  motion?: string;
  /** Voicebox 生成 ID（既存 /audio/{id} を取得。API 自体は変更しない） */
  ttsGenerationId?: string | null;
  audioBytes?: Buffer | null;
  audioFilename?: string | null;
  imageBytes?: Buffer | null;
  imageFilename?: string | null;
  videoBytes?: Buffer | null;
  videoFilename?: string | null;
  /** TTS 側が返す尺。未指定時はファイルから probe */
  audioDurationSec?: number | null;
};

export type WorkspaceVideoResult = {
  success: true;
  script: string;
  audio_url: string;
  visual_source: WorkspaceVisualSource;
  provider: string;
  captions_on: boolean;
  captions_burned: boolean;
  subtitle_file: string | null;
  source_video_url: string;
  final_video_url: string;
  filename: string;
  bytes: number;
  duration_sec: number;
  aspect_ratio: "9:16";
};

export type WorkspaceVideoError = {
  success: false;
  error: string;
};
