/**
 * Kling 実API 直叩き（mock なし）
 * Usage: npx tsx scripts/probe-kling.ts
 */
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { KlingVideoProvider } from "../src/lib/video-generation/kling";
import { buildMotionPrompt } from "../src/lib/video-generation/provider";

async function loadEnv() {
  const env = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

async function fetchTestImageBase64(): Promise<string> {
  const url = "https://picsum.photos/512/768";
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`test image download failed: HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  console.log(
    `[probe-kling] test_image bytes=${bytes.length} content-type=${
      res.headers.get("content-type") ?? "?"
    }`
  );
  return bytes.toString("base64");
}

async function main() {
  await loadEnv();
  process.env.VIDEO_PROVIDER = "kling";
  process.env.VIDEO_ALLOW_MOCK_FALLBACK = "false";
  if (!process.env.KLING_API_BASE) {
    process.env.KLING_API_BASE = "https://api-singapore.klingai.com";
  }

  console.log("[probe-kling] KLING_API_BASE=", process.env.KLING_API_BASE);
  console.log(
    "[probe-kling] KLING_API_KEY=",
    process.env.KLING_API_KEY
      ? `set(len=${process.env.KLING_API_KEY.length})`
      : "MISSING"
  );
  console.log(
    "[probe-kling] KLING_MODEL=",
    process.env.KLING_MODEL || "kling-v1-6"
  );

  if (!process.env.KLING_API_KEY?.trim()) {
    console.error("[probe-kling] ABORT: KLING_API_KEY missing");
    process.exit(2);
  }

  const imageBase64 = await fetchTestImageBase64();
  const motion = "slow cinematic push-in toward the product";
  const productName = "test earbuds";
  const prompt = buildMotionPrompt(motion, productName);

  const provider = new KlingVideoProvider();
  const startedAt = Date.now();

  const result = await provider.generate({
    imageBase64,
    motion,
    prompt,
    productName,
    durationSec: 5,
  });

  const dir = path.join(process.cwd(), "public", "generated", "videos");
  await mkdir(dir, { recursive: true });
  const filename = `zenova-kling-${Date.now()}-${randomUUID().slice(0, 8)}.mp4`;
  const filepath = path.join(dir, filename);
  await writeFile(filepath, result.videoBytes);

  console.log(
    JSON.stringify(
      {
        ok: true,
        provider: result.provider,
        used_real_api: true,
        model: result.model,
        remote_url: result.remoteUrl,
        video_url: `/generated/videos/${filename}`,
        filepath,
        bytes: result.videoBytes.length,
        elapsed_ms: Date.now() - startedAt,
        meta: result.meta,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("[probe-kling] FAILED", err);
  process.exit(1);
});
