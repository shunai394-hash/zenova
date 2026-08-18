import { createRequire } from "module";
import { spawn } from "child_process";
import { accessSync, constants, mkdirSync } from "fs";
import path from "path";

function ensureParentDir(filePath: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function fontsDirFilterSuffix(): string {
  if (process.platform !== "win32") return "";
  return `:fontsdir='${toFfmpegSubtitleFilterPath("C:/Windows/Fonts")}'`;
}

function ffmpegFileName(): string {
  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

function isPlaceholderPath(bin: string): boolean {
  return /(^|[\\/])ROOT[\\/]/i.test(bin);
}

function isExistingBinary(bin: string): boolean {
  if (!bin || isPlaceholderPath(bin)) return false;
  try {
    accessSync(bin, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Next/Turbopack が ffmpeg-static の __dirname を \ROOT\... に置き換えるため、
 * ESM import は使わず、実行時 require + 実ファイル確認で解決する。
 * PATH は見ない。
 */
export function getFfmpegPath(): string {
  const tried: string[] = [];
  const fileName = ffmpegFileName();

  try {
    const req = createRequire(
      path.join(process.cwd(), "package.json")
    );
    const fromPkg = req("ffmpeg-static") as string | null;
    if (fromPkg) {
      tried.push(fromPkg);
      if (isExistingBinary(fromPkg)) return fromPkg;
    }
  } catch (error) {
    tried.push(
      `require("ffmpeg-static") failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const local = path.join(
    process.cwd(),
    "node_modules",
    "ffmpeg-static",
    fileName
  );
  tried.push(local);
  if (isExistingBinary(local)) return local;

  throw new Error(
    [
      "FFmpeg バイナリが見つかりません (ENOENT)。PATH は使用していません。",
      `探したパス:`,
      ...tried.map((p) => `- ${p}`),
      `node_modules/ffmpeg-static/${fileName} を確認してください。`,
    ].join("\n")
  );
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
  const fonts = fontsDirFilterSuffix();
  const vf = isAss
    ? `ass='${escaped}'${fonts}`
    : `subtitles='${escaped}'${fonts}`;

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

/**
 * ffmpeg -i の stderr から Duration を読む（ffprobe 不要）。
 * 入力検査のみなので終了コード 1 は正常。
 */
export async function probeDurationSec(filePath: string): Promise<number | null> {
  const bin = getFfmpegPath();

  return new Promise((resolve) => {
    const child = spawn(bin, ["-i", filePath], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", () => resolve(null));
    child.on("close", () => {
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!match) {
        resolve(null);
        return;
      }
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      const total = hours * 3600 + minutes * 60 + seconds;
      resolve(Number.isFinite(total) && total > 0 ? total : null);
    });
  });
}

const VERTICAL_PAD_VF =
  "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30,format=yuv420p";

const VERTICAL_CROP_VF =
  "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,format=yuv420p";

/**
 * 静止画を音声尺の 9:16 MP4 にする（ローカル ffmpeg。新規動画 API ではない）。
 */
export async function stillImageToVerticalVideo(input: {
  imagePath: string;
  durationSec: number;
  outputPath: string;
}): Promise<void> {
  const duration = Math.max(1, Math.min(120, input.durationSec));
  ensureParentDir(input.outputPath);
  await runFfmpeg([
    "-y",
    "-loop",
    "1",
    "-i",
    input.imagePath,
    "-t",
    duration.toFixed(3),
    "-vf",
    VERTICAL_CROP_VF,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-an",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    input.outputPath,
  ]);
}

/**
 * 既存クリップを 9:16 に収め、指定尺までループ or カットする。
 */
export async function fitVideoToVerticalDuration(input: {
  videoPath: string;
  durationSec: number;
  outputPath: string;
}): Promise<void> {
  const duration = Math.max(1, Math.min(120, input.durationSec));
  ensureParentDir(input.outputPath);
  await runFfmpeg([
    "-y",
    "-stream_loop",
    "-1",
    "-i",
    input.videoPath,
    "-t",
    duration.toFixed(3),
    "-vf",
    VERTICAL_PAD_VF,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-an",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    input.outputPath,
  ]);
}

/**
 * 動画 + ナレーション + BGM を合成する。
 * ナレーションを優先し、BGMは小さめの音量でループして動画尺に合わせる。
 */
export async function mergeVideoWithNarrationAndBgm(input: {
  videoPath: string;
  narrationPath?: string | null;
  bgmPath?: string | null;
  outputPath: string;
  bgmVolume?: number;
}): Promise<void> {
  const narrationPath = input.narrationPath || null;
  const bgmPath = input.bgmPath || null;
  const bgmVolume = Math.max(0.01, Math.min(1, input.bgmVolume ?? 0.16));

  if (!narrationPath && !bgmPath) {
    throw new Error("narrationPath または bgmPath が必要です");
  }

  const args = [
    "-y",
    "-i",
    input.videoPath,
  ];

  if (narrationPath) {
    args.push("-i", narrationPath);
  }

  if (bgmPath) {
    args.push("-stream_loop", "-1", "-i", bgmPath);
  }

  const narrationIndex = narrationPath ? 1 : -1;
  const bgmIndex = bgmPath ? (narrationPath ? 2 : 1) : -1;

  const filters: string[] = [];
  const mixInputs: string[] = [];

  if (narrationPath) {
    filters.push(
      `[${narrationIndex}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[narration]`
    );
    mixInputs.push("[narration]");
  }

  if (bgmPath) {
    filters.push(
      `[${bgmIndex}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${bgmVolume},aloop=loop=-1:size=2e+09[bgm]`
    );
    mixInputs.push("[bgm]");
  }

  if (mixInputs.length === 1) {
    filters.push(`${mixInputs[0]}apad[aout]`);
  } else {
    filters.push(
      `${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=2:normalize=0[aout]`
    );
  }

  args.push(
    "-filter_complex",
    filters.join(";"),
    "-map",
    "0:v:0",
    "-map",
    "[aout]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    "-movflags",
    "+faststart",
    input.outputPath
  );

  console.log(
    `[video-composer] mix narration=${narrationPath ?? "none"} ` +
      `bgm=${bgmPath ?? "none"} volume=${bgmVolume} out=${input.outputPath}`
  );

  await runFfmpeg(args);
}
