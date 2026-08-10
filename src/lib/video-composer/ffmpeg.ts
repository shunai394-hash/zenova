import { spawn } from "child_process";
import { accessSync, constants } from "fs";
import ffmpegPath from "ffmpeg-static";

export function getFfmpegPath(): string {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static バイナリが見つかりません");
  }
  return ffmpegPath;
}

export function runFfmpeg(args: string[]): Promise<void> {
  const bin = getFfmpegPath();

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `ffmpeg failed (exit ${code}): ${stderr.slice(-1200) || "no stderr"}`
        )
      );
    });
  });
}

/**
 * 動画映像 + ナレーション音声を合成。
 * - 映像コーデックは可能なら copy
 * - 音声は AAC
 * - 音声が短い場合は無音パッド、長い場合は動画長で切る（-shortest ではなく duration 合わせ）
 *   → 実装は apad + -shortest で動画長優先（映像を切らない）
 */
export async function mergeVideoWithAudio(input: {
  videoPath: string;
  audioPath: string;
  outputPath: string;
}): Promise<void> {
  // 映像を維持し、音声を動画尺に合わせる:
  // 1) 音声を apad で延長
  // 2) -shortest で動画終了時に切る
  // 既存音声トラックは捨ててナレーションを載せる
  const args = [
    "-y",
    "-i",
    input.videoPath,
    "-i",
    input.audioPath,
    "-filter_complex",
    "[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,apad[a]",
    "-map",
    "0:v:0",
    "-map",
    "[a]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    "-movflags",
    "+faststart",
    input.outputPath,
  ];

  console.log(
    `[video-composer] ffmpeg merge video=${input.videoPath} audio=${input.audioPath} out=${input.outputPath}`
  );

  try {
    await runFfmpeg(args);
  } catch (error) {
    // copy 失敗時（コーデック都合）は再エンコード
    console.warn(
      "[video-composer] copy failed; retry with re-encode",
      error instanceof Error ? error.message : error
    );
    const fallbackArgs = [
      "-y",
      "-i",
      input.videoPath,
      "-i",
      input.audioPath,
      "-filter_complex",
      "[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,apad[a]",
      "-map",
      "0:v:0",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "-movflags",
      "+faststart",
      "-pix_fmt",
      "yuv420p",
      input.outputPath,
    ];
    await runFfmpeg(fallbackArgs);
  }
}

/** Windows でも動く ASS パスの ffmpeg filter 用エスケープ */
export function toFfmpegSubtitleFilterPath(filePath: string): string {
  return filePath
    .replace(/\\/g, "/")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'");
}

function resolveDrawtextFontFile(): string | null {
  const candidates =
    process.platform === "win32"
      ? [
          "C:/Windows/Fonts/arial.ttf",
          "C:/Windows/Fonts/Arial.ttf",
          "C:/Windows/Fonts/segoeui.ttf",
          "C:/Windows/Fonts/meiryo.ttc",
        ]
      : process.platform === "darwin"
        ? [
            "/System/Library/Fonts/Helvetica.ttc",
            "/Library/Fonts/Arial.ttf",
            "/System/Library/Fonts/SFNS.ttf",
          ]
        : [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
          ];

  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.R_OK);
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Free プラン向け: 720p スケール + ZENOVA テキストロゴ焼き込み
 */
export async function burnWatermarkIntoVideo(input: {
  videoPath: string;
  outputPath: string;
  /** 縦動画想定: 幅 720（720p） */
  maxWidth?: number;
}): Promise<void> {
  const maxWidth = input.maxWidth ?? 720;
  const fontFile = resolveDrawtextFontFile();
  const fontOpt = fontFile
    ? `:fontfile='${toFfmpegSubtitleFilterPath(fontFile)}'`
    : "";

  // 右下に半透明 ZENOVA ロゴ文字
  const drawtext =
    `drawtext=text='ZENOVA'${fontOpt}:fontsize=h*0.055:fontcolor=white@0.72:` +
    `borderw=2:bordercolor=black@0.35:x=w-tw-36:y=h-th-36`;

  const vf = `scale='min(${maxWidth},iw)':-2,${drawtext}`;

  const baseArgs = [
    "-y",
    "-i",
    input.videoPath,
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-movflags",
    "+faststart",
    "-pix_fmt",
    "yuv420p",
  ];

  console.log(
    `[video-composer] burn watermark vf=${vf} out=${input.outputPath}`
  );

  try {
    await runFfmpeg([...baseArgs, "-c:a", "copy", input.outputPath]);
  } catch (error) {
    console.warn(
      "[video-composer] watermark a:copy failed; retry aac",
      error instanceof Error ? error.message : error
    );
    await runFfmpeg([
      ...baseArgs,
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      input.outputPath,
    ]);
  }
}

/**
 * ASS/SRT を映像に焼き込み（再エンコード必須）
 */
export async function burnSubtitlesIntoVideo(input: {
  videoPath: string;
  subtitlePath: string;
  outputPath: string;
}): Promise<void> {
  const escaped = toFfmpegSubtitleFilterPath(input.subtitlePath);
  const isAss = input.subtitlePath.toLowerCase().endsWith(".ass");
  const vf = isAss ? `ass='${escaped}'` : `subtitles='${escaped}'`;

  const args = [
    "-y",
    "-i",
    input.videoPath,
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-c:a",
    "copy",
    "-movflags",
    "+faststart",
    "-pix_fmt",
    "yuv420p",
    input.outputPath,
  ];

  console.log(
    `[video-composer] burn subtitles vf=${vf} out=${input.outputPath}`
  );

  try {
    await runFfmpeg(args);
  } catch (error) {
    // 音声 copy 失敗時は aac 再エンコード
    console.warn(
      "[video-composer] burn with a:copy failed; retry aac",
      error instanceof Error ? error.message : error
    );
    await runFfmpeg([
      "-y",
      "-i",
      input.videoPath,
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      "-pix_fmt",
      "yuv420p",
      input.outputPath,
    ]);
  }
}
