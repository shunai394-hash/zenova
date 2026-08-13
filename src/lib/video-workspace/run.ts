import path from "path";
import { generateVideoCaptions } from "@/lib/video-caption";
import {
  composeSalesVideo,
  fitVideoToVerticalDuration,
  probeDurationSec,
  stillImageToVerticalVideo,
} from "@/lib/video-composer";
import { generateAiVideo, resolveProviderId } from "@/lib/video-generation";
import {
  detectAudioExtension,
  extensionFromName,
  fetchVoiceboxAudioBytes,
  saveGeneratedFile,
  stampFilename,
} from "./media";
import type {
  WorkspaceVideoInput,
  WorkspaceVideoResult,
  WorkspaceVisualSource,
} from "./types";

function asScript(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function normalizeDurationSec(value: number | null | undefined): number {
  if (!value || !Number.isFinite(value) || value <= 0) return 15;
  const seconds = value > 120 && value <= 120_000 ? value / 1000 : value;
  return Math.max(3, Math.min(60, seconds));
}

function shouldTryConnectedVideoApi(): boolean {
  const id = resolveProviderId();
  return id === "kling" || id === "luma";
}

async function persistAudio(input: WorkspaceVideoInput): Promise<{
  publicUrl: string;
  absPath: string;
}> {
  let bytes = input.audioBytes ?? null;
  if (!bytes && input.ttsGenerationId) {
    bytes = await fetchVoiceboxAudioBytes(input.ttsGenerationId);
  }
  if (!bytes) {
    throw new Error("音声がありません。先に Qwen 音声を生成してください。");
  }

  const ext = detectAudioExtension(
    bytes,
    extensionFromName(input.audioFilename, "wav")
  );
  return saveGeneratedFile({
    subdir: "audio",
    filename: stampFilename("zenova-workspace-audio", ext),
    bytes,
  });
}

async function persistImage(input: WorkspaceVideoInput): Promise<{
  publicUrl: string;
  absPath: string;
  base64: string;
} | null> {
  if (!input.imageBytes) return null;
  const ext = extensionFromName(input.imageFilename, "png");
  const saved = await saveGeneratedFile({
    subdir: "images",
    filename: stampFilename("zenova-workspace-image", ext),
    bytes: input.imageBytes,
  });
  const mime =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "webp"
        ? "image/webp"
        : "image/png";
  return {
    ...saved,
    base64: `data:${mime};base64,${input.imageBytes.toString("base64")}`,
  };
}

async function persistUploadedVideo(input: WorkspaceVideoInput): Promise<{
  publicUrl: string;
  absPath: string;
} | null> {
  if (!input.videoBytes) return null;
  const ext = extensionFromName(input.videoFilename, "mp4");
  return saveGeneratedFile({
    subdir: "videos",
    filename: stampFilename("zenova-workspace-clip", ext),
    bytes: input.videoBytes,
  });
}

async function tryConnectedImageToVideo(input: {
  imageBase64: string;
  motion: string;
  durationSec: number;
}): Promise<{
  publicUrl: string;
  absPath: string;
  provider: string;
} | null> {
  if (!shouldTryConnectedVideoApi()) return null;

  try {
    const result = await generateAiVideo({
      imageBase64: input.imageBase64,
      motion: input.motion,
      productName: "workspace",
      durationSec: input.durationSec,
    });

    if (result.provider === "mock") {
      console.warn(
        "[video-workspace] connected provider returned mock; using still-image clip"
      );
      return null;
    }

    const saved = await saveGeneratedFile({
      subdir: "videos",
      filename: stampFilename("zenova-workspace-ai", "mp4"),
      bytes: result.videoBytes,
    });

    return {
      ...saved,
      provider: result.provider,
    };
  } catch (error) {
    console.error(
      "[video-workspace] connected video API failed; falling back to still image",
      error
    );
    return null;
  }
}

/**
 * 台本 + Qwen 音声 + 素材 → 字幕（任意）→ 9:16 MP4
 * Voicebox API / Voice UI は変更しない。
 */
export async function runWorkspaceVideoPipeline(
  input: WorkspaceVideoInput
): Promise<WorkspaceVideoResult> {
  const script = asScript(input.script);
  if (!script) {
    throw new Error("台本を入力してください");
  }
  if (!input.imageBytes && !input.videoBytes) {
    throw new Error("動画素材または画像素材を選択してください");
  }

  const audio = await persistAudio(input);
  const probed = await probeDurationSec(audio.absPath);
  const durationSec = normalizeDurationSec(
    probed ?? input.audioDurationSec ?? 15
  );

  const uploadedVideo = await persistUploadedVideo(input);
  const image = await persistImage(input);
  const motion =
    input.motion?.trim() ||
    "gentle camera push-in, natural lighting, vertical 9:16";

  let visualSource: WorkspaceVisualSource = "still_image";
  let provider = "ffmpeg";
  let sourceVideoUrl = "";

  const verticalName = stampFilename("zenova-workspace-916", "mp4");
  const verticalAbs = path.join(
    process.cwd(),
    "public",
    "generated",
    "videos",
    verticalName
  );

  if (uploadedVideo) {
    visualSource = "uploaded_video";
    provider = "upload";
    await fitVideoToVerticalDuration({
      videoPath: uploadedVideo.absPath,
      durationSec,
      outputPath: verticalAbs,
    });
    sourceVideoUrl = `/generated/videos/${verticalName}`;
  } else if (image) {
    const ai = await tryConnectedImageToVideo({
      imageBase64: image.base64,
      motion,
      durationSec,
    });

    let usedAi = false;
    if (ai) {
      try {
        await fitVideoToVerticalDuration({
          videoPath: ai.absPath,
          durationSec,
          outputPath: verticalAbs,
        });
        visualSource = ai.provider === "luma" ? "luma" : "kling";
        provider = ai.provider;
        sourceVideoUrl = `/generated/videos/${verticalName}`;
        usedAi = true;
      } catch (error) {
        console.error(
          "[video-workspace] AI clip could not be normalized; still-image fallback",
          error
        );
      }
    }

    if (!usedAi) {
      visualSource = "still_image";
      provider = "ffmpeg-still";
      await stillImageToVerticalVideo({
        imagePath: image.absPath,
        durationSec,
        outputPath: verticalAbs,
      });
      sourceVideoUrl = `/generated/videos/${verticalName}`;
    }
  } else {
    throw new Error("動画素材または画像素材を選択してください");
  }

  let subtitleFile: string | null = null;
  if (input.captionsOn) {
    const captions = await generateVideoCaptions({
      narration_script: script,
      duration: durationSec,
    });
    subtitleFile = captions.subtitle_file;
  }

  const composed = await composeSalesVideo({
    video_url: sourceVideoUrl,
    audio_url: audio.publicUrl,
    narration_script: script,
    subtitle_file: subtitleFile,
    burn_captions: input.captionsOn && Boolean(subtitleFile),
  });

  return {
    success: true,
    script,
    audio_url: audio.publicUrl,
    visual_source: visualSource,
    provider,
    captions_on: input.captionsOn,
    captions_burned: composed.captions_burned,
    subtitle_file: composed.subtitle_file,
    source_video_url: sourceVideoUrl,
    final_video_url: composed.final_video_url,
    filename: composed.filename,
    bytes: composed.bytes,
    duration_sec: durationSec,
    aspect_ratio: "9:16",
  };
}
