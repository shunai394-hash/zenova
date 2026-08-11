export type NarrationSceneInput = {
  optimized_hook: string;
  optimized_scene_1: string;
  optimized_scene_2: string;
  optimized_scene_3: string;
  optimized_cta: string;
  product_name?: string;
  /** 指定時は台本生成をスキップしてこの文言を使う */
  script_override?: string;
  /** ElevenLabs voice_id（任意） */
  voice_id?: string;
  /** false のとき音声生成をスキップ（台本のみ可） */
  generate_audio?: boolean;
  /** 事実ゲート用 */
  confirmed?: string[];
  excluded?: string[];
  productAnalysis?: import("@/lib/product-analysis").ProductAnalysis | null;
};

export type NarrationResult = {
  script: string;
  audio_url: string | null;
  voice_provider: "elevenlabs" | null;
  voice_id: string | null;
  filename: string | null;
  bytes: number | null;
  skipped: boolean;
  skip_reason: string | null;
};
