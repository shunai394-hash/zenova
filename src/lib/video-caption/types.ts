export type CaptionCue = {
  start: string;
  end: string;
  text: string;
};

export type GenerateCaptionsRequest = {
  narration_script: string;
  /** 動画尺（秒） */
  duration: number;
  /** シーン文言（任意・分割ヒント） */
  scenes?: string[] | null;
};

export type GenerateCaptionsResult = {
  captions: CaptionCue[];
  subtitle_file: string;
  format: "ass" | "srt";
  duration_sec: number;
};
