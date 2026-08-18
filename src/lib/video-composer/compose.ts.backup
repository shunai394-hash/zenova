import { copyFile, mkdir, stat, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  burnSubtitlesIntoVideo,
  burnWatermarkIntoVideo,
  mergeVideoWithAudio,
} from "./ffmpeg";
import { assertReadableFile, resolvePublicMediaPath } from "./paths";
import type { ComposeVideoInput, ComposeVideoResult } from "./types";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * 動画 + 任意音声 + 任意字幕焼き込み → public/generated/videos
 * watermark_required 時のみ ZENOVA ロゴ + 720p。
 * 音声・字幕なしでも元動画を final として返す（Starter 以上は既存どおり）。
 */
export async function composeSalesVideo(
  input: ComposeVideoInput
): Promise<ComposeVideoResult> {
  const videoUrl = asString(input.video_url);
  const audioUrl = asString(input.audio_url ?? "") || null;
  const narrationScript = asString(input.narration_script ?? "") || null;
  const subtitleFile = asString(input.subtitle_file ?? "") || null;
  const burnCaptions =
    input.burn_captions === undefined
      ? Boolean(subtitleFile)
      : Boolean(input.burn_captions);
  const watermarkRequired = Boolean(input.watermark_required);

  if (!videoUrl) {
    throw new Error("video_url は必須です");
  }

  const videoPath = resolvePublicMediaPath(videoUrl);
  await assertReadableFile(videoPath, "video");

  const outDir = path.join(process.cwd(), "public", "generated", "videos");
  await mkdir(outDir, { recursive: true });

  const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  let workingPath = videoPath;
  let audioMerged = false;
  let captionsBurned = false;
  let watermarkApplied = false;
  let tempMerged: string | null = null;
  const tempsToClean: string[] = [];

  try {
    if (audioUrl) {
      const audioPath = resolvePublicMediaPath(audioUrl);
      await assertReadableFile(audioPath, "audio");
      tempMerged = path.join(outDir, `zenova-tmp-merge-${stamp}.mp4`);
      await mergeVideoWithAudio({
        videoPath,
        audioPath,
        outputPath: tempMerged,
      });
      workingPath = tempMerged;
      audioMerged = true;
      tempsToClean.push(tempMerged);
    }

    if (burnCaptions && subtitleFile) {
      const subtitlePath = resolvePublicMediaPath(subtitleFile);
      await assertReadableFile(subtitlePath, "subtitle");
      const burnedPath = path.join(outDir, `zenova-tmp-cap-${stamp}.mp4`);
      await burnSubtitlesIntoVideo({
        videoPath: workingPath,
        subtitlePath,
        outputPath: burnedPath,
      });
      workingPath = burnedPath;
      captionsBurned = true;
      tempsToClean.push(burnedPath);
    }

    if (watermarkRequired) {
      const wmPath = path.join(outDir, `zenova-final-${stamp}.mp4`);
      await burnWatermarkIntoVideo({
        videoPath: workingPath,
        outputPath: wmPath,
        maxWidth: 720,
      });
      workingPath = wmPath;
      watermarkApplied = true;
    } else if (captionsBurned || audioMerged) {
      const finalPath = path.join(outDir, `zenova-final-${stamp}.mp4`);
      if (workingPath !== finalPath) {
        await copyFile(workingPath, finalPath);
        workingPath = finalPath;
      }
    } else {
      // 何も合成しない（既存）
      const finalPath = path.join(outDir, `zenova-final-${stamp}.mp4`);
      await copyFile(videoPath, finalPath);
      workingPath = finalPath;
    }

    const filename = path.basename(workingPath);
    const bytes = (await stat(workingPath)).size;
    if (bytes < 1000) {
      throw new Error("合成後の mp4 が不正です（サイズが小さすぎます）");
    }

    const skipped =
      !audioMerged && !captionsBurned && !watermarkApplied;
    console.log(
      `[video-composer] done final_video_url=/generated/videos/${filename} ` +
        `audio_merged=${audioMerged} captions_burned=${captionsBurned} ` +
        `watermark_applied=${watermarkApplied} bytes=${bytes}`
    );

    return {
      final_video_url: `/generated/videos/${filename}`,
      audio_merged: audioMerged,
      captions_burned: captionsBurned,
      watermark_applied: watermarkApplied,
      subtitle_file: subtitleFile,
      filename,
      bytes,
      video_url: videoUrl,
      audio_url: audioUrl,
      narration_script: narrationScript,
      skipped,
      skip_reason: skipped
        ? "no audio/subtitles/watermark; returned video copy"
        : null,
    };
  } finally {
    for (const temp of tempsToClean) {
      try {
        if (temp !== workingPath) {
          await unlink(temp);
        }
      } catch {
        /* ignore */
      }
    }
  }
}
