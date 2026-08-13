const DEFAULT_TTS_API_URL = "http://127.0.0.1:17493";

/**
 * Voicebox / Qwen TTS バックエンドの Base URL。
 * 優先順: TTS_API_URL → NEXT_PUBLIC_TTS_API_URL → VOICEBOX_BASE_URL → ローカル既定
 */
export function getTtsApiBaseUrl(): string {
  const raw =
    process.env.TTS_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_TTS_API_URL?.trim() ||
    process.env.VOICEBOX_BASE_URL?.trim() ||
    DEFAULT_TTS_API_URL;

  return raw.replace(/\/+$/, "");
}

/** ブラウザから呼ぶ ZENOVA 側プロキシ（CORS回避） */
export const TTS_PROXY_BASE = "/api/tts";
