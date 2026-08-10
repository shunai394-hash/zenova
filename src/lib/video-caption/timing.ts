import Groq from "groq-sdk";
import type { CaptionCue } from "./types";
import { formatAssTime } from "./format";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clampDuration(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 15;
  return Math.min(60, Math.max(3, duration));
}

/** 台本を短いフレーズに分割（ローカル） */
export function splitNarrationIntoPhrases(
  script: string,
  scenes?: string[] | null
): string[] {
  const cleaned = script
    .replace(/\r/g, "")
    .replace(/\n+/g, "。")
    .replace(/[！!？?]/g, "。")
    .replace(/[、，]/g, "、");

  let parts = cleaned
    .split(/[。．.]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0 && scenes?.length) {
    parts = scenes.map((s) => asString(s)).filter(Boolean);
  }

  // 長すぎる行はさらに分割
  const refined: string[] = [];
  for (const part of parts) {
    if (part.length <= 22) {
      refined.push(part);
      continue;
    }
    const chunks = part.split(/[、，\s]+/).filter(Boolean);
    let buf = "";
    for (const chunk of chunks) {
      if ((buf + chunk).length > 20 && buf) {
        refined.push(buf);
        buf = chunk;
      } else {
        buf = buf ? `${buf}${chunk}` : chunk;
      }
    }
    if (buf) refined.push(buf);
  }

  return refined.length > 0 ? refined : [script.trim() || "チェック"];
}

/**
 * 各字幕を 1〜3 秒で配置。全体 duration に収める。
 */
export function assignCaptionTimings(
  phrases: string[],
  durationSec: number
): Array<{ startSec: number; endSec: number; text: string }> {
  const duration = clampDuration(durationSec);
  const n = Math.max(1, phrases.length);

  // 理想: 各 1.5〜2.5 秒。足りなければ圧縮、余れば余白を末尾に
  const ideal = Math.min(2.5, Math.max(1.2, duration / n));
  const totalIdeal = ideal * n;
  const scale = totalIdeal > duration ? duration / totalIdeal : 1;
  const slot = Math.min(3, Math.max(1, ideal * scale));

  const cues: Array<{ startSec: number; endSec: number; text: string }> = [];
  let t = 0.05;

  for (let i = 0; i < n; i++) {
    const startSec = Number(t.toFixed(2));
    let endSec = Number(Math.min(duration - 0.05, t + slot).toFixed(2));
    if (i === n - 1) {
      endSec = Number(Math.max(startSec + 0.8, duration - 0.05).toFixed(2));
    }
    if (endSec <= startSec) {
      endSec = Number(Math.min(duration, startSec + 1).toFixed(2));
    }
    cues.push({
      startSec,
      endSec,
      text: phrases[i],
    });
    t = endSec + 0.05;
    if (t >= duration) break;
  }

  return cues;
}

function getGroqClient(): Groq | null {
  const apiKey =
    process.env.GROQ_API_KEY?.trim() ||
    process.env.Groq_API_KEY?.trim();
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

/** TikTok向けに短い表現へ最適化（失敗時は原文） */
export async function optimizePhrasesForTikTok(
  phrases: string[]
): Promise<string[]> {
  const groq = getGroqClient();
  if (!groq || phrases.length === 0) return phrases;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "あなたはTikTok字幕ライターです。JSONのみ返します。各行を12文字前後の短い話し言葉に整えます。",
        },
        {
          role: "user",
          content: `
次の字幕フレーズをTikTok向けに短く鋭くしてください。
意味は保ち、絵文字なし、1行あたり最大18文字目安。

入力:
${JSON.stringify(phrases, null, 2)}

JSONのみ:
{ "phrases": ["", ""] }
`.trim(),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(text) as { phrases?: unknown };
    if (!Array.isArray(parsed.phrases)) return phrases;

    const optimized = parsed.phrases
      .map((p) => asString(p))
      .filter(Boolean);

    if (optimized.length === 0) return phrases;
    // 件数が大きくズレたら原文
    if (Math.abs(optimized.length - phrases.length) > 2) return phrases;
    return optimized;
  } catch (error) {
    console.warn("[video-caption] optimize fallback:", error);
    return phrases;
  }
}

export function toCaptionCues(
  timed: Array<{ startSec: number; endSec: number; text: string }>
): CaptionCue[] {
  return timed.map((c) => ({
    start: formatAssTime(c.startSec),
    end: formatAssTime(c.endSec),
    text: c.text,
  }));
}
