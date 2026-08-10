/**
 * video-composer 動作確認（実ファイル合成 + 音声ストリーム確認）
 * Usage: npx tsx scripts/probe-video-composer.ts
 */
import { spawn } from "child_process";
import { readdir, stat } from "fs/promises";
import path from "path";
import ffmpegPath from "ffmpeg-static";
import { composeSalesVideo } from "../src/lib/video-composer";

async function pickLargest(dir: string, ext: string): Promise<string> {
  const files = await readdir(dir);
  const matched = files.filter((f) => f.toLowerCase().endsWith(ext));
  if (matched.length === 0) {
    throw new Error(`no *${ext} in ${dir}`);
  }
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
  const videosDir = path.join(process.cwd(), "public", "generated", "videos");
  const audioDir = path.join(process.cwd(), "public", "generated", "audio");

  const videoName = await pickLargest(videosDir, ".mp4");
  const audioName = await pickLargest(audioDir, ".mp3");
  const video_url = `/generated/videos/${videoName}`;
  const audio_url = `/generated/audio/${audioName}`;

  console.log("[probe-video-composer] video=", video_url);
  console.log("[probe-video-composer] audio=", audio_url);

  const startedAt = Date.now();
  const merged = await composeSalesVideo({
    video_url,
    audio_url,
    narration_script: "probe narration script",
  });

  const outPath = path.join(videosDir, merged.filename);
  const probe = await probeMedia(outPath);

  const passthrough = await composeSalesVideo({
    video_url,
    audio_url: null,
    narration_script: null,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        elapsed_ms: Date.now() - startedAt,
        merged: {
          final_video_url: merged.final_video_url,
          audio_merged: merged.audio_merged,
          bytes: merged.bytes,
          has_video_stream: probe.hasVideo,
          has_audio_stream: probe.hasAudio,
          duration: probe.durationApprox,
        },
        passthrough: {
          final_video_url: passthrough.final_video_url,
          audio_merged: passthrough.audio_merged,
          skipped: passthrough.skipped,
        },
      },
      null,
      2
    )
  );

  if (!merged.audio_merged) throw new Error("expected audio_merged=true");
  if (!probe.hasVideo) throw new Error("output mp4 has no video stream");
  if (!probe.hasAudio) throw new Error("output mp4 has no audio stream");
  if (passthrough.audio_merged) throw new Error("passthrough should not merge");
}

main().catch((err) => {
  console.error("[probe-video-composer] FAILED", err);
  process.exit(1);
});
