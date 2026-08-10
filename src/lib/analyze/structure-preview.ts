import type { AiPlanBrief } from "@/lib/analyze/plan-brief";
import type { VideoSettings } from "@/lib/analyze/video-settings";

export type StructureBeat = {
  index: number;
  /** 表示用ラベル（フック / 本編 など） */
  label: string;
  /** 内容 */
  text: string;
  /** 目安秒（概算） */
  startSec: number;
  endSec: number;
};

/**
 * 企画書の構成テキストをタイムライン用ビートに分解。
 */
export function buildStructureBeats(input: {
  brief: AiPlanBrief;
  settings?: VideoSettings | null;
}): StructureBeat[] {
  const duration = input.settings?.duration_sec ?? 15;
  const lines = input.brief.structure
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^\d+[\.\)\、]\s*/, ""));

  const hook = input.brief.firstThreeSeconds.trim();
  const cta = input.brief.cta.trim();

  const raw: { label: string; text: string }[] = [];
  if (hook) {
    raw.push({ label: "最初の3秒", text: hook });
  }
  if (lines.length > 0) {
    lines.forEach((text, i) => {
      raw.push({
        label: i === 0 && !hook ? "オープニング" : `シーン ${i + 1}`,
        text,
      });
    });
  } else if (!hook) {
    raw.push({ label: "本編", text: "商品の魅力を短尺で伝える" });
  }
  if (cta) {
    raw.push({ label: "CTA", text: cta });
  }

  const n = Math.max(1, raw.length);
  const slice = duration / n;

  return raw.map((item, index) => {
    const startSec = Math.round(index * slice * 10) / 10;
    const endSec =
      index === n - 1
        ? duration
        : Math.round((index + 1) * slice * 10) / 10;
    return {
      index: index + 1,
      label: item.label,
      text: item.text,
      startSec,
      endSec,
    };
  });
}
