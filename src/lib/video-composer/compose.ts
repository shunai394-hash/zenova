import { copyFile, mkdir, stat, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  burnSubtitlesIntoVideo,
  burnWatermarkIntoVideo,
  mergeVideoWithAudio,
  mergeVideoWithNarrationAndBgm,
} from "./ffmpeg";
import { assertReadableFile, resolvePublicMediaPath } from "./paths";
import type { ComposeVideoInput, ComposeVideoResult } from "./types";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * 動画 + ナレーション + BGM + 字幕 + ウォーターマークを合成する。
 *
 * 音声優先順位:
 *   narration + BGM → ナレーションを主音声、BGMを小さくミックス
 *   narrationのみ   → ナレーション
 *   BGMのみ         → BGM
 *   どちらもなし    → 元動画
 */
export async function composeSalesVideo(
  input: ComposeVideoInput
): Promise<ComposeVideoResult> {
  const videoUrl = asString(input.video_url);
  const audioUrl = asString(input.audio_url ?? "") || null;
  const bgmUrl = asString(input.bgm_url ?? "") || null;
  const narrationScript = asString(input.narration_script ?? "") || null;
  const subtitleFile = asString(input.subtitle_file ?? "") || null;

  const burnCaptions =
    input.burn_captions === undefined
      ? Boolean(subtitleFile)
      : Boolean(input.burn_captions);

  const watermarkRequired = Boolean(input.watermark_required);

  if (!videoUrl) {
    throw new Error("video_url is required");
  }

  const videoPath = resolvePublicMediaPath(videoUrl);
  await assertReadableFile(videoPath, "video");

  const outDir = path.join(process.cwd(), "public", "generated", "videos");
  await mkdir(outDir, { recursive: true });

  const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;

  let workingPath = videoPath;
  let audioMerged = false;
  let bgmMerged = false;
  let captionsBurned = false;
  let watermarkApplied = false;

  const tempsToClean: string[] = [];

  try {
    /*
     * 1. ナレーション + BGM
     */
    if (audioUrl || bgmUrl) {
      const audioPath = audioUrl
        ? resolvePublicMediaPath(audioUrl)
        : null;

      const bgmPath = bgmUrl
        ? resolvePublicMediaPath(bgmUrl)
        : null;

      if (audioPath) {
        await assertReadableFile(audioPath, "audio");
      }

      if (bgmPath) {
        await assertReadableFile(bgmPath, "bgm");
      }

      const mixedPath = path.join(
        outDir,
        `zenova-tmp-audio-${stamp}.mp4`
      );

      if (audioPath && bgmPath) {
        await mergeVideoWithNarrationAndBgm({
          videoPath: workingPath,
          narrationPath: audioPath,
          bgmPath,
          outputPath: mixedPath,
          bgmVolume: 0.16,
        });

        audioMerged = true;
        bgmMerged = true;
      } else if (audioPath) {
        await mergeVideoWithAudio({
          videoPath: workingPath,
          audioPath,
          outputPath: mixedPath,
        });

        audioMerged = true;
      } else if (bgmPath) {
        await mergeVideoWithNarrationAndBgm({
          videoPath: workingPath,
          bgmPath,
          outputPath: mixedPath,
          bgmVolume: 0.16,
        });

        bgmMerged = true;
      }

      workingPath = mixedPath;
      tempsToClean.push(mixedPath);
    }

    /*
     * 2. 字幕
     */
    if (burnCaptions && subtitleFile) {
      const subtitlePath = resolvePublicMediaPath(subtitleFile);
      await assertReadableFile(subtitlePath, "subtitle");

      const burnedPath = path.join(
        outDir,
        `zenova-tmp-cap-${stamp}.mp4`
      );

      await burnSubtitlesIntoVideo({
        videoPath: workingPath,
        subtitlePath,
        outputPath: burnedPath,
      });

      workingPath = burnedPath;
      captionsBurned = true;
      tempsToClean.push(burnedPath);
    }

    /*
     * 3. 最終ファイル
     */
    const finalPath = path.join(
      outDir,
      `zenova-final-${stamp}.mp4`
    );

    if (watermarkRequired) {
      await burnWatermarkIntoVideo({
        videoPath: workingPath,
        outputPath: finalPath,
        maxWidth: 720,
      });

      workingPath = finalPath;
      watermarkApplied = true;
    } else {
      await copyFile(workingPath, finalPath);
      workingPath = finalPath;
    }

    const filename = path.basename(workingPath);
    const bytes = (await stat(workingPath)).size;

    if (bytes < 1000) {
      throw new Error(
        "Final mp4 is invalid or too small"
      );
    }

    const skipped =
      !audioMerged &&
      !bgmMerged &&
      !captionsBurned &&
      !watermarkApplied;

    console.log(
      `[video-composer] done ` +
        `final_video_url=/generated/videos/${filename} ` +
        `audio_merged=${audioMerged} ` +
        `bgm_merged=${bgmMerged} ` +
        `captions_burned=${captionsBurned} ` +
        `watermark_applied=${watermarkApplied} ` +
        `bytes=${bytes}`
    );

    return {
      final_video_url: `/generated/videos/${filename}`,
      audio_merged: audioMerged,
      bgm_merged: bgmMerged,
      captions_burned: captionsBurned,
      watermark_applied: watermarkApplied,
      subtitle_file: subtitleFile,
      filename,
      bytes,
      video_url: videoUrl,
      audio_url: audioUrl,
      bgm_url: bgmUrl,
      narration_script: narrationScript,
      skipped,
      skip_reason: skipped
        ? "no audio/bgm/subtitles/watermark; returned video copy"
        : null,
    };
  } finally {
    for (const temp of tempsToClean) {
      try {
        if (temp !== workingPath) {
          await unlink(temp);
        }
      } catch {
        /* ignore cleanup errors */
      }
    }
  }
}
