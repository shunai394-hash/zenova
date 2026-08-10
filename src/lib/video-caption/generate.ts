import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { buildAss, buildSrt } from "./format";
import {
  assignCaptionTimings,
  optimizePhrasesForTikTok,
  splitNarrationIntoPhrases,
  toCaptionCues,
} from "./timing";
import type {
  GenerateCaptionsRequest,
  GenerateCaptionsResult,
} from "./types";

/**
 * ナレーション台本から字幕タイミング＋ASS/SRTを生成し public/generated/subtitles に保存
 */
export async function generateVideoCaptions(
  input: GenerateCaptionsRequest
): Promise<GenerateCaptionsResult> {
  const script = String(input.narration_script ?? "").trim();
  if (!script) {
    throw new Error("narration_script は必須です");
  }

  const duration = Number(input.duration) || 15;
  const scenes = Array.isArray(input.scenes)
    ? input.scenes.map((s) => String(s ?? "").trim()).filter(Boolean)
    : null;

  const rawPhrases = splitNarrationIntoPhrases(script, scenes);
  const phrases = await optimizePhrasesForTikTok(rawPhrases);
  const timed = assignCaptionTimings(phrases, duration);
  const captions = toCaptionCues(timed);

  const dir = path.join(process.cwd(), "public", "generated", "subtitles");
  await mkdir(dir, { recursive: true });

  const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const assName = `zenova-captions-${id}.ass`;
  const srtName = `zenova-captions-${id}.srt`;
  const assPath = path.join(dir, assName);
  const srtPath = path.join(dir, srtName);

  await writeFile(assPath, buildAss(timed), "utf8");
  await writeFile(srtPath, buildSrt(timed), "utf8");

  const subtitleFile = `/generated/subtitles/${assName}`;

  console.log(
    `[video-caption] saved subtitle_file=${subtitleFile} cues=${captions.length} duration=${duration}`
  );

  return {
    captions,
    subtitle_file: subtitleFile,
    format: "ass",
    duration_sec: duration,
  };
}
