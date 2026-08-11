import type { AiPlanBrief } from "@/lib/analyze/plan-brief";
import type { VideoSettings } from "@/lib/analyze/video-settings";
import { allocateSceneSeconds } from "@/lib/analyze/scene-timing";

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
 * 合計秒数 = duration、重複・抜けなし。
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
    .map((l) =>
      l
        .replace(/^\d+[\.\)\、]\s*/, "")
        .replace(/^\d+\s*[-–—~〜]\s*\d+\s*秒[:：]?\s*/, "")
        .replace(/^\d+[-–—]\d+秒[:：]?\s*/, "")
    );

  const hook = input.brief.firstThreeSeconds.trim();
  const cta = input.brief.cta.trim();

  const raw: { label: string; text: string }[] = [];

  // structure に秒付き行が既にある場合はそれを優先（選択企画を尊重）
  const structuredLines = input.brief.structure
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const hasTimed = structuredLines.some((l) =>
    /\d+\s*[-–—~〜]\s*\d+/.test(l)
  );

  if (hasTimed && structuredLines.length > 0) {
    return structuredLines.map((line, index) => {
      const m = line.match(/(\d+)\s*[-–—~〜]\s*(\d+)/);
      const startSec = m ? Number(m[1]) : index;
      const endSec = m ? Number(m[2]) : index + 1;
      const text = line
        .replace(/^\d+\s*[-–—~〜]\s*\d+\s*秒?[:：]?\s*/, "")
        .replace(/^\d+[\.\)\、]\s*/, "");
      const labelParts = text.split(/[—\-–]/);
      return {
        index: index + 1,
        label: (labelParts[0] || `シーン ${index + 1}`).trim().slice(0, 20),
        text: text.trim(),
        startSec,
        endSec,
      };
    });
  }

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
  if (cta && !raw.some((r) => /CTA|誘導/.test(r.label + r.text))) {
    raw.push({ label: "CTA", text: cta });
  }

  const n = Math.max(1, raw.length);
  const slots = allocateSceneSeconds(duration, n);

  return raw.map((item, index) => ({
    index: index + 1,
    label: item.label,
    text: item.text,
    startSec: slots[index]?.startSec ?? 0,
    endSec: slots[index]?.endSec ?? duration,
  }));
}
