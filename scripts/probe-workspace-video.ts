/**
 * Video Workspace E2E:
 * 台本 → Voicebox Qwen TTS → 画像 → 字幕 → 9:16 MP4
 *
 * Usage: npx tsx scripts/probe-workspace-video.ts
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const PREFERRED_PROFILE_ID = "3446cc5c-df29-450a-aa85-2df7a772a4d0";
const SCRIPT =
  "こんにちは。ZENOVAのショート動画です。今日のポイントを、わかりやすく紹介します。";

async function loadEnv() {
  const env = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

function ttsBase(): string {
  return (
    process.env.TTS_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_TTS_API_URL?.trim() ||
    "http://127.0.0.1:17493"
  ).replace(/\/+$/, "");
}

async function waitForStatus(id: string): Promise<{
  status: string;
  duration?: number;
  error?: string | null;
}> {
  const started = Date.now();
  while (Date.now() - started < 180_000) {
    const res = await fetch(`${ttsBase()}/generate/${encodeURIComponent(id)}/status`, {
      headers: { Accept: "text/event-stream, application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    const matches = [...text.matchAll(/data:\s*(\{.*\})/g)];
    const last = matches.length
      ? (JSON.parse(matches[matches.length - 1][1]) as {
          status: string;
          duration?: number;
          error?: string | null;
        })
      : null;
    const parsed =
      last ||
      (text.trim().startsWith("{")
        ? (JSON.parse(text) as {
            status: string;
            duration?: number;
            error?: string | null;
          })
        : null);
    const status = (parsed?.status || "").toLowerCase();
    if (status === "completed" || status === "failed" || status === "cancelled") {
      return parsed ?? { status };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("TTS status timeout");
}

function probeMedia(filePath: string): Promise<string> {
  const bin = ffmpegPath;
  if (!bin) throw new Error("ffmpeg-static missing");
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ["-i", filePath], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", () => resolve(stderr));
  });
}

async function ensureSampleImage(): Promise<Buffer> {
  const out = path.join(process.cwd(), "public", "samples", "workspace-vertical.jpg");
  await mkdir(path.dirname(out), { recursive: true });
  const bin = ffmpegPath;
  if (!bin) throw new Error("ffmpeg-static missing");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      bin,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=0x16162a:s=1080x1920:d=1",
        "-frames:v",
        "1",
        "-q:v",
        "4",
        out,
      ],
      { windowsHide: true, stdio: "ignore" }
    );
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`sample image ffmpeg exit ${code}`))
    );
  });
  return readFile(out);
}

async function main() {
  await loadEnv();
  const startedAt = Date.now();
  const steps: Record<string, string> = {};

  const health = await fetch(`${ttsBase()}/health`, { cache: "no-store" });
  if (!health.ok) {
    throw new Error(`Voicebox health failed HTTP ${health.status}`);
  }
  steps.voicebox_health = "ok";

  const profiles = (await (
    await fetch(`${ttsBase()}/profiles`, { cache: "no-store" })
  ).json()) as Array<{ id: string; name: string; language?: string }>;
  const profile =
    profiles.find((p) => p.id === PREFERRED_PROFILE_ID) ||
    profiles.find((p) => /qwen\s*japanese\s*test/i.test(p.name)) ||
    profiles.find((p) => p.language === "ja") ||
    profiles[0];
  if (!profile) throw new Error("No Voicebox profile");
  steps.profile = `${profile.name} (${profile.id})`;

  const genRes = await fetch(`${ttsBase()}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    },
    body: JSON.stringify({
      profile_id: profile.id,
      text: SCRIPT,
      language: "ja",
      model_size: "1.7B",
      engine: "qwen",
      normalize: true,
    }),
  });
  if (!genRes.ok) {
    throw new Error(`TTS generate failed HTTP ${genRes.status}: ${(await genRes.text()).slice(0, 300)}`);
  }
  const started = (await genRes.json()) as { id: string };
  steps.tts_started = started.id;

  const status = await waitForStatus(started.id);
  steps.tts_status = status.status;
  if (status.status.toLowerCase() !== "completed") {
    throw new Error(`TTS not completed: ${status.status} ${status.error ?? ""}`);
  }

  const audioRes = await fetch(`${ttsBase()}/audio/${started.id}`, { cache: "no-store" });
  if (!audioRes.ok) {
    throw new Error(`TTS audio HTTP ${audioRes.status}`);
  }
  const audioBytes = Buffer.from(await audioRes.arrayBuffer());
  steps.audio_bytes = String(audioBytes.length);

  const imageBytes = await ensureSampleImage();
  steps.sample_image = "public/samples/workspace-vertical.jpg";

  const { runWorkspaceVideoPipeline } = await import(
    "../src/lib/video-workspace/run"
  );
  const result = await runWorkspaceVideoPipeline({
    script: SCRIPT,
    captionsOn: true,
    ttsGenerationId: started.id,
    audioBytes,
    audioFilename: "probe.wav",
    imageBytes,
    imageFilename: "workspace-vertical.jpg",
    audioDurationSec: status.duration ?? null,
  });

  const abs = path.join(
    process.cwd(),
    "public",
    result.final_video_url.replace(/^\//, "")
  );
  const info = await probeMedia(abs);
  const hasVideo = /Video:\s*\w+/i.test(info);
  const hasAudio = /Audio:\s*\w+/i.test(info);
  const duration = info.match(/Duration:\s*([\d:.]+)/)?.[1] ?? null;

  console.log(
    JSON.stringify(
      {
        ok: hasVideo && hasAudio,
        elapsed_ms: Date.now() - startedAt,
        steps,
        result: {
          final_video_url: result.final_video_url,
          provider: result.provider,
          visual_source: result.visual_source,
          captions_burned: result.captions_burned,
          bytes: result.bytes,
          duration_sec: result.duration_sec,
        },
        probe: { hasVideo, hasAudio, duration, abs },
      },
      null,
      2
    )
  );

  if (!hasVideo || !hasAudio) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exit(1);
});
