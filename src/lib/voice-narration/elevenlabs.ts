/**
 * ElevenLabs Text-to-Speech
 * POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
 */

const DEFAULT_VOICE_ID = "FGY2WhTYpPnrIDTdsKH5"; // Laura（social_media / premade）
const DEFAULT_MODEL = "eleven_multilingual_v2";

export function getElevenLabsApiKey(): string | null {
  return process.env.ELEVENLABS_API_KEY?.trim() || null;
}

export function getElevenLabsVoiceId(): string {
  return (
    process.env.ELEVENLABS_VOICE_ID?.trim() ||
    process.env.ELEVEN_VOICE_ID?.trim() ||
    DEFAULT_VOICE_ID
  );
}

export function getElevenLabsModelId(): string {
  return process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL;
}

export async function synthesizeSpeechMp3(input: {
  text: string;
  voiceId?: string;
}): Promise<{ audioBytes: Buffer; voiceId: string; modelId: string }> {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY が未設定です");
  }

  const text = input.text.trim();
  if (!text) {
    throw new Error("音声化するテキストが空です");
  }

  const voiceId = input.voiceId?.trim() || getElevenLabsVoiceId();
  const modelId = getElevenLabsModelId();
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  console.log(
    `[voice-narration:elevenlabs] TTS request_url=${url} ` +
      `model_id=${modelId} text_chars=${text.length}`
  );

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.75,
        style: 0.25,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(
      `[voice-narration:elevenlabs] FAIL http_status=${res.status} ` +
        `response_body=${body.slice(0, 800)}`
    );
    throw new Error(
      `ElevenLabs TTS failed (HTTP ${res.status}): ${body.slice(0, 300)}`
    );
  }

  const audioBytes = Buffer.from(await res.arrayBuffer());
  if (audioBytes.length < 100) {
    throw new Error("ElevenLabs: 音声データが空または不正です");
  }

  return { audioBytes, voiceId, modelId };
}
