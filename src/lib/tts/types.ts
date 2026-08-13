export type TtsEngine =
  | "qwen"
  | "qwen_custom_voice"
  | "luxtts"
  | "chatterbox"
  | "chatterbox_turbo"
  | "tada"
  | "kokoro";

export type TtsLanguage =
  | "zh"
  | "en"
  | "ja"
  | "ko"
  | "de"
  | "fr"
  | "ru"
  | "pt"
  | "es"
  | "it"
  | "he"
  | "ar"
  | "da"
  | "el"
  | "fi"
  | "hi"
  | "ms"
  | "nl"
  | "no"
  | "pl"
  | "sv"
  | "sw"
  | "tr";

export type GenerationStatus =
  | "queued"
  | "generating"
  | "completed"
  | "failed"
  | "cancelled"
  | string;

export type VoiceProfile = {
  id: string;
  name: string;
  description?: string | null;
  language: string;
  voice_type?: string;
  default_engine?: string | null;
  sample_count?: number;
  generation_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type VoiceProfileCreateInput = {
  name: string;
  description?: string | null;
  language?: TtsLanguage | string;
  default_engine?: TtsEngine | string | null;
  voice_type?: string | null;
};

export type ProfileSample = {
  id: string;
  profile_id?: string;
  reference_text?: string;
  created_at?: string;
};

export type GenerationRequest = {
  profile_id: string;
  text: string;
  language?: TtsLanguage | string;
  model_size?: string | null;
  engine?: TtsEngine | string | null;
  normalize?: boolean;
  instruct?: string | null;
};

export type GenerationResponse = {
  id: string;
  profile_id: string;
  text: string;
  language: string;
  status: GenerationStatus;
  engine?: string | null;
  model_size?: string | null;
  duration?: number;
  error?: string | null;
  audio_path?: string;
};

export type GenerationStatusEvent = {
  id: string;
  status: GenerationStatus;
  duration?: number;
  error?: string | null;
  source?: string | null;
};

export type TranscriptionResponse = {
  text: string;
  duration: number;
};
