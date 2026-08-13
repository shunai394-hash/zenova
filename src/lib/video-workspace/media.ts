import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getTtsApiBaseUrl } from "@/lib/tts/config";

export function generatedPublicUrl(subdir: string, filename: string): string {
  return `/generated/${subdir}/${filename}`;
}

export async function saveGeneratedFile(input: {
  subdir: "audio" | "videos" | "images";
  filename: string;
  bytes: Buffer;
}): Promise<{ absPath: string; publicUrl: string }> {
  const dir = path.join(process.cwd(), "public", "generated", input.subdir);
  await mkdir(dir, { recursive: true });
  const absPath = path.join(dir, input.filename);
  await writeFile(absPath, input.bytes);
  return {
    absPath,
    publicUrl: generatedPublicUrl(input.subdir, input.filename),
  };
}

export function stampFilename(prefix: string, ext: string): string {
  const safeExt = ext.replace(/^\./, "").toLowerCase() || "bin";
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}.${safeExt}`;
}

export function extensionFromName(name: string | null | undefined, fallback: string): string {
  const raw = name?.split(".").pop()?.trim().toLowerCase();
  if (!raw || raw.length > 5) return fallback;
  return raw.replace(/[^a-z0-9]/g, "") || fallback;
}

export function detectAudioExtension(bytes: Buffer, fallback = "wav"): string {
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF") return "wav";
  if (bytes.length >= 3 && bytes.toString("ascii", 0, 3) === "ID3") return "mp3";
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return "mp3";
  }
  return fallback;
}

/**
 * 既存 Voicebox の GET /audio/{id} を読むだけ。エンドポイント仕様は変更しない。
 */
export async function fetchVoiceboxAudioBytes(generationId: string): Promise<Buffer> {
  const id = generationId.trim();
  if (!id) {
    throw new Error("tts_generation_id が空です");
  }

  const res = await fetch(
    `${getTtsApiBaseUrl()}/audio/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: { Accept: "audio/wav, audio/mpeg, audio/*" },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Voicebox 音声の取得に失敗しました (HTTP ${res.status}): ${body.slice(0, 300)}`
    );
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 100) {
    throw new Error("Voicebox 音声が空です");
  }
  return bytes;
}
