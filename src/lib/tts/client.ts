import { TTS_PROXY_BASE } from "./config";
import { waitForGenerationStatus } from "./sse";
import type {
  GenerationRequest,
  GenerationResponse,
  GenerationStatusEvent,
  ProfileSample,
  TranscriptionResponse,
  VoiceProfile,
  VoiceProfileCreateInput,
} from "./types";

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return `HTTP ${res.status}`;
  try {
    const json = JSON.parse(text) as {
      detail?: unknown;
      error?: string;
      message?: string;
    };
    if (typeof json.error === "string") return json.error;
    if (typeof json.message === "string") return json.message;
    if (typeof json.detail === "string") return json.detail;
    if (Array.isArray(json.detail)) {
      return json.detail
        .map((d) =>
          typeof d === "object" && d && "msg" in d
            ? String((d as { msg: unknown }).msg)
            : JSON.stringify(d)
        )
        .join("; ");
    }
  } catch {
    // plain text
  }
  return text.slice(0, 300);
}

async function ttsFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  // ブラウザは必ず同一オリジンの /api/tts を叩く（Voicebox へ直接接続しない）
  const url = `${TTS_PROXY_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new Error(
      "TTS API に接続できません。Voicebox が起動しているか、NEXT_PUBLIC_TTS_API_URL を確認してください。"
    );
  }
}

function asVoiceProfileList(data: unknown): VoiceProfile[] {
  if (Array.isArray(data)) return data as VoiceProfile[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["profiles", "data", "items", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as VoiceProfile[];
    }
  }
  return [];
}

export async function listVoiceProfiles(): Promise<VoiceProfile[]> {
  const res = await ttsFetch("/profiles", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Profile一覧の取得に失敗: ${await readErrorMessage(res)}`);
  }
  const data = (await res.json()) as unknown;
  return asVoiceProfileList(data);
}

export async function createVoiceProfile(
  input: VoiceProfileCreateInput
): Promise<VoiceProfile> {
  const res = await ttsFetch("/profiles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name: input.name,
      description: input.description ?? null,
      language: input.language ?? "ja",
      default_engine: input.default_engine ?? "qwen",
      voice_type: input.voice_type ?? "cloned",
    }),
  });

  if (!res.ok) {
    throw new Error(`Profile作成に失敗: ${await readErrorMessage(res)}`);
  }

  return (await res.json()) as VoiceProfile;
}

export async function listProfileSamples(
  profileId: string
): Promise<ProfileSample[]> {
  const res = await ttsFetch(
    `/profiles/${encodeURIComponent(profileId)}/samples`
  );
  if (!res.ok) {
    throw new Error(`Sample一覧の取得に失敗: ${await readErrorMessage(res)}`);
  }
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as ProfileSample[]) : [];
}

export async function addProfileSample(input: {
  profileId: string;
  file: File;
  referenceText: string;
}): Promise<ProfileSample> {
  const form = new FormData();
  form.append("file", input.file, input.file.name);
  form.append("reference_text", input.referenceText);

  const res = await ttsFetch(
    `/profiles/${encodeURIComponent(input.profileId)}/samples`,
    {
      method: "POST",
      body: form,
    }
  );

  if (!res.ok) {
    throw new Error(`Sample登録に失敗: ${await readErrorMessage(res)}`);
  }

  return (await res.json()) as ProfileSample;
}

export async function transcribeAudio(input: {
  file: File;
  language?: string;
}): Promise<TranscriptionResponse> {
  const form = new FormData();
  form.append("file", input.file, input.file.name);
  form.append("language", input.language ?? "ja");

  const res = await ttsFetch("/transcribe", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`文字起こしに失敗: ${await readErrorMessage(res)}`);
  }

  return (await res.json()) as TranscriptionResponse;
}

export async function startGeneration(
  input: GenerationRequest
): Promise<GenerationResponse> {
  const res = await ttsFetch("/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    },
    body: JSON.stringify({
      profile_id: input.profile_id,
      text: input.text,
      language: input.language ?? "ja",
      model_size: input.model_size ?? "1.7B",
      engine: input.engine ?? "qwen",
      normalize: input.normalize ?? true,
      ...(input.instruct ? { instruct: input.instruct } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`音声生成の開始に失敗: ${await readErrorMessage(res)}`);
  }

  return (await res.json()) as GenerationResponse;
}

export async function watchGenerationStatus(
  generationId: string,
  options?: {
    onUpdate?: (event: GenerationStatusEvent) => void;
    signal?: AbortSignal;
  }
): Promise<GenerationStatusEvent> {
  const res = await ttsFetch(
    `/generate/${encodeURIComponent(generationId)}/status`,
    {
      method: "GET",
      headers: {
        Accept: "text/event-stream, application/json",
      },
      signal: options?.signal,
    }
  );

  return waitForGenerationStatus(res, options);
}

export function getGenerationAudioUrl(generationId: string): string {
  return `${TTS_PROXY_BASE}/audio/${encodeURIComponent(generationId)}`;
}

export async function checkTtsHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await ttsFetch("/health", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as {
      status?: string;
    } | null;
    if (data && typeof data.status === "string") {
      return data.status.toLowerCase() === "healthy";
    }
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
