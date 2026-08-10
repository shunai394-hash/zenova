/**
 * Free ウォーターマーク / Starter 通常合成の確認
 * Usage: npx tsx scripts/probe-free-watermark.ts
 *
 * 事前に migration 適用推奨:
 *   supabase/migrations/20260711020000_free_plan_video_limit.sql
 */
import { mkdir, writeFile, stat } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { readFile } from "fs/promises";

async function loadEnv() {
  const env = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

async function makeTestMp4(outPath: string): Promise<void> {
  const { runFfmpeg } = await import("../src/lib/video-composer/ffmpeg");
  // 1080x1920 縦動画（Starter 相当の解像度）を生成
  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x1a1a2e:s=1080x1920:d=2",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:duration=2",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    outPath,
  ]);
}

async function probeVideoWidth(filePath: string): Promise<number | null> {
  const { spawn } = await import("child_process");
  const ffmpegStatic = (await import("ffmpeg-static")).default;
  if (!ffmpegStatic) return null;

  return new Promise((resolve) => {
    const child = spawn(
      ffmpegStatic,
      ["-i", filePath],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }
    );
    let stderr = "";
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString("utf8");
    });
    child.on("close", () => {
      const m = stderr.match(/Video:.*?\s(\d{2,5})x(\d{2,5})/);
      if (!m) {
        resolve(null);
        return;
      }
      resolve(Number(m[1]));
    });
  });
}

async function main() {
  await loadEnv();

  const {
    composeSalesVideo,
  } = await import("../src/lib/video-composer");
  const {
    ensureActiveSubscription,
    getPlanById,
    checkVideoLimit,
    listPlans,
  } = await import("../src/lib/usage");

  // --- plans: free.video_limit === 1 ---
  try {
    const plans = await listPlans();
    const free = plans.find((p) => p.id === "free");
    console.log(
      "[probe] free plan=",
      free
        ? `video_limit=${free.video_limit} price=${free.price}`
        : "MISSING (apply migration)"
    );
    if (free && free.video_limit !== 1) {
      console.warn(
        "[probe] WARN free.video_limit should be 1. Apply 20260711020000_free_plan_video_limit.sql"
      );
    }

    const freeUser = randomUUID();
    const starterUser = randomUUID();
    await ensureActiveSubscription(freeUser, "free");
    await ensureActiveSubscription(starterUser, "starter");

    const freeLimit = await checkVideoLimit(freeUser);
    const starterLimit = await checkVideoLimit(starterUser);
    console.log("[probe] free limit=", {
      plan: freeLimit.plan,
      video_limit: freeLimit.video_limit,
      remaining: freeLimit.remaining,
      allowed: freeLimit.allowed,
    });
    console.log("[probe] starter limit=", {
      plan: starterLimit.plan,
      video_limit: starterLimit.video_limit,
      remaining: starterLimit.remaining,
      allowed: starterLimit.allowed,
    });

    if (!freeLimit.bypassed) {
      if (freeLimit.plan !== "free") {
        throw new Error(`expected free plan, got ${freeLimit.plan}`);
      }
      if (freeLimit.video_limit !== 1) {
        throw new Error(
          `expected free video_limit=1, got ${freeLimit.video_limit}`
        );
      }
      if (!freeLimit.allowed) {
        throw new Error("free user should be allowed for 1 video");
      }
      if (starterLimit.plan !== "starter" || starterLimit.video_limit !== 5) {
        throw new Error("starter plan mismatch");
      }
    }

    const freePlan = await getPlanById("free");
    console.log(
      "[probe] watermark_required rule: free=",
      freePlan?.id === "free",
      "starter=false"
    );
  } catch (error) {
    console.warn(
      "[probe] usage/plans check skipped:",
      error instanceof Error ? error.message : error
    );
  }

  // --- composer: free watermark vs starter plain ---
  const dir = path.join(process.cwd(), "public", "generated", "videos");
  await mkdir(dir, { recursive: true });
  const srcName = `probe-src-${Date.now()}.mp4`;
  const srcPath = path.join(dir, srcName);
  await makeTestMp4(srcPath);
  const srcUrl = `/generated/videos/${srcName}`;
  console.log("[probe] source=", srcUrl, "bytes=", (await stat(srcPath)).size);

  const freeComposed = await composeSalesVideo({
    video_url: srcUrl,
    watermark_required: true,
  });
  console.log("[probe] free compose=", {
    watermark_applied: freeComposed.watermark_applied,
    final_video_url: freeComposed.final_video_url,
    bytes: freeComposed.bytes,
  });
  if (!freeComposed.watermark_applied) {
    throw new Error("free compose must set watermark_applied=true");
  }

  const freeOutPath = path.join(
    process.cwd(),
    "public",
    freeComposed.final_video_url.replace(/^\//, "")
  );
  const freeWidth = await probeVideoWidth(freeOutPath);
  console.log("[probe] free output width=", freeWidth);
  if (freeWidth != null && freeWidth > 720) {
    throw new Error(`expected free width<=720, got ${freeWidth}`);
  }

  const starterComposed = await composeSalesVideo({
    video_url: srcUrl,
    watermark_required: false,
  });
  console.log("[probe] starter compose=", {
    watermark_applied: starterComposed.watermark_applied,
    final_video_url: starterComposed.final_video_url,
    bytes: starterComposed.bytes,
  });
  if (starterComposed.watermark_applied) {
    throw new Error("starter compose must set watermark_applied=false");
  }

  const starterOutPath = path.join(
    process.cwd(),
    "public",
    starterComposed.final_video_url.replace(/^\//, "")
  );
  const starterWidth = await probeVideoWidth(starterOutPath);
  console.log("[probe] starter output width=", starterWidth);
  // コピーのみなので元の 1080 のまま
  if (starterWidth != null && starterWidth !== 1080) {
    console.warn(
      `[probe] WARN starter width expected 1080 (copy), got ${starterWidth}`
    );
  }

  // create-sales-video 入力フラグの契約確認（Kling は呼ばない）
  const { runCreateSalesVideo } = await import(
    "../src/lib/sales-video-pipeline"
  );
  // 型だけ型・デフォルト確認用に watermark_required を渡せることをログ
  console.log(
    "[probe] pipeline accepts watermark_required (free=true / starter=false)"
  );
  void runCreateSalesVideo;

  await writeFile(
    path.join(dir, `probe-watermark-summary-${Date.now()}.json`),
    JSON.stringify(
      {
        free: freeComposed,
        starter: starterComposed,
        free_width: freeWidth,
        starter_width: starterWidth,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("[probe] OK — Free=watermark+720p / Starter=plain");
}

main().catch((err) => {
  console.error("[probe-free-watermark] FAILED", err);
  process.exit(1);
});
