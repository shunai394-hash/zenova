/**
 * 字幕生成 + 焼き込み確認
 * Usage: npx tsx scripts/probe-video-captions.ts
 */
import { spawn } from "child_process";
import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import ffmpegPath from "ffmpeg-static";
import { generateVideoCaptions } from "../src/lib/video-caption";
import { composeSalesVideo } from "../src/lib/video-composer";

async function loadEnv() {
  try {
    const env = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  } catch {
    /* ignore */
  }
}

async function pickLargest(dir: string, ext: string): Promise<string> {
  const files = await readdir(dir);
  const matched = files.filter((f) => f.toLowerCase().endsWith(ext));
  if (!matched.length) throw new Error(`no *${ext} in ${dir}`);
  const ranked = await Promise.all(
    matched.map(async (name) => ({
      name,
      size: (await stat(path.join(dir, name))).size,
    }))
  );
  ranked.sort((a, b) => b.size - a.size);
  return ranked[0].name;
}

function probeMedia(filePath: string): Promise<{
  hasAudio: boolean;
  hasVideo: boolean;
  durationApprox: string | null;
}> {
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
    child.on("close", () => {
      resolve({
        hasAudio: /Audio:\s*\w+/i.test(stderr),
        hasVideo: /Video:\s*\w+/i.test(stderr),
        durationApprox: stderr.match(/Duration:\s*([\d:.]+)/)?.[1] ?? null,
      });
    });
  });
}

async function main() {
  await loadEnv();

  const narration_script =
    "ランニング中のイヤホンが外れるストレス、もう終わり。走る人が困っている。外れないイヤホンで快適に走る。汗をかいても安定。今すぐチェック。";

  console.log("[probe] 1) generate captions");
  const captions = await generateVideoCaptions({
    narration_script,
    duration: 5,
    scenes: [
      "走る人が困る",
      "外れないイヤホン",
      "汗でも安定",
      "今すぐチェック",
    ],
  });

  console.log("[probe] cues=", captions.captions.length);
  console.log("[probe] subtitle_file=", captions.subtitle_file);

  const videosDir = path.join(process.cwd(), "public", "generated", "videos");
  const audioDir = path.join(process.cwd(), "public", "generated", "audio");
  const videoName = await pickLargest(videosDir, ".mp4");
  const audioName = await pickLargest(audioDir, ".mp3");

  console.log("[probe] 2) compose with burn");
  const startedAt = Date.now();
  const composed = await composeSalesVideo({
    video_url: `/generated/videos/${videoName}`,
    audio_url: `/generated/audio/${audioName}`,
    narration_script,
    subtitle_file: captions.subtitle_file,
    burn_captions: true,
  });

  const outPath = path.join(videosDir, composed.filename);
  const probe = await probeMedia(outPath);

  // 字幕なしパス
  const noCap = await composeSalesVideo({
    video_url: `/generated/videos/${videoName}`,
    audio_url: `/generated/audio/${audioName}`,
    burn_captions: false,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        elapsed_ms: Date.now() - startedAt,
        captions: captions.captions,
        subtitle_file: captions.subtitle_file,
        composed: {
          final_video_url: composed.final_video_url,
          audio_merged: composed.audio_merged,
          captions_burned: composed.captions_burned,
          bytes: composed.bytes,
          has_video: probe.hasVideo,
          has_audio: probe.hasAudio,
          duration: probe.durationApprox,
        },
        without_captions: {
          final_video_url: noCap.final_video_url,
          captions_burned: noCap.captions_burned,
          audio_merged: noCap.audio_merged,
        },
      },
      null,
      2
    )
  );

  if (!composed.captions_burned) throw new Error("expected captions_burned");
  if (!probe.hasVideo || !probe.hasAudio) {
    throw new Error("output missing video/audio stream");
  }
  if (noCap.captions_burned) throw new Error("noCap should not burn");
}

main().catch((err) => {
  console.error("[probe-video-captions] FAILED", err);
  process.exit(1);
});
