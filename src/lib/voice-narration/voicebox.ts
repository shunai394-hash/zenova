import { getTtsApiBaseUrl } from "@/lib/tts/config";

function getBaseUrl(): string {
  return getTtsApiBaseUrl();
}

export function getVoiceboxProfileId(): string | null {
  return process.env.VOICEBOX_PROFILE_ID?.trim() || null;
}

export function getVoiceboxEngine(): string | null {
  return process.env.VOICEBOX_ENGINE?.trim() || null;
}

export function getVoiceboxInstruct(): string {
  return (
    process.env.VOICEBOX_INSTRUCT?.trim() ||
    "natural, warm, clear, Japanese narration"
  );
}

export async function checkVoiceboxHealth(): Promise<boolean> {
  const res = await fetch(`${getBaseUrl()}/health`, {
    method: "GET",
    cache: "no-store",
  });

  return res.ok;
}

export async function synthesizeSpeechWav(input: {
  text: string;
  profileId?: string;
  engine?: string;
  instruct?: string;
}): Promise<{
  audioBytes: Buffer;
  profileId: string;
  engine: string;
}> {
  const text = input.text.trim();

  if (!text) {
    throw new Error("Voicebox: text is empty");
  }

  const profileId =
    input.profileId?.trim() ||
    getVoiceboxProfileId();

  if (!profileId) {
    throw new Error(
      "Voicebox: VOICEBOX_PROFILE_ID is not configured"
    );
  }

  const engine =
    input.engine?.trim() ||
    getVoiceboxEngine();

  if (!engine) {
    throw new Error(
      "Voicebox: VOICEBOX_ENGINE is not configured"
    );
  }

  const res = await fetch(`${getBaseUrl()}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/wav",
    },
    body: JSON.stringify({
      text,
      profile_id: profileId,
      engine,
      instruct: input.instruct?.trim() || getVoiceboxInstruct(),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Voicebox TTS failed (HTTP ${res.status}): ${body.slice(0, 500)}`
    );
  }

  const audioBytes = Buffer.from(await res.arrayBuffer());

  if (audioBytes.length < 100) {
    throw new Error("Voicebox: generated audio is empty or invalid");
  }

  return {
    audioBytes,
    profileId,
    engine,
  };
}
