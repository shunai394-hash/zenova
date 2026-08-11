import type { AiPlanBrief } from "@/lib/analyze/plan-brief";
import { allocateSceneSeconds } from "@/lib/analyze/scene-timing";
import type {
  AnalysisResult,
  VideoIdea,
  VideoPlan,
  VideoPlanTimelineItem,
} from "./types";

/**
 * 企画書・分析結果・尺から VideoPlan を構築。
 * preview でも同じデータを利用する。
 */
export function buildVideoPlan(input: {
  title: string;
  style: string;
  duration: number;
  brief?: AiPlanBrief | null;
  analysis?: AnalysisResult | null;
  ideaId?: string | null;
  goal?: VideoPlan["goal"];
  cta?: string | null;
}): VideoPlan {
  const duration = Math.min(60, Math.max(5, Number(input.duration) || 15));
  const timeline =
    buildTimelineFromStructure(
      input.brief?.structure,
      input.analysis?.videoStructure,
      duration,
      input.brief,
      input.analysis
    ) || defaultTimeline(duration, input.brief, input.analysis);

  return {
    title: input.title.trim() || "商品紹介動画",
    style: input.style.trim() || "ugc",
    duration,
    timeline,
    ideaId: input.ideaId ?? null,
    goal: input.goal ?? "purchase",
    cta:
      input.cta?.trim() ||
      input.brief?.cta?.trim() ||
      input.analysis?.cta ||
      "詳細を見る",
  };
}

/**
 * VideoIdea 選択 → VideoPlan 生成（選択企画を再解釈しない）
 */
export function buildVideoPlanFromIdea(input: {
  idea: VideoIdea;
  duration?: number;
  productName?: string;
}): VideoPlan {
  const duration = Math.min(
    60,
    Math.max(
      5,
      Number(input.duration) ||
        inferDurationFromTimeline(input.idea.timeline) ||
        30
    )
  );

  const timeline =
    input.idea.timeline.length > 0
      ? rescaleTimeline(input.idea.timeline, duration)
      : defaultIdeaTimeline(input.idea, duration);

  return {
    title:
      input.idea.title.trim() ||
      input.productName?.trim() ||
      "商品紹介動画",
    style: input.idea.videoStyle || "ugc",
    duration,
    timeline,
    ideaId: input.idea.id,
    goal: input.idea.goal ?? "purchase",
    cta: input.idea.cta || "詳細を見る",
  };
}

/** ダミー企画（フロー検証用） */
export function createDummyVideoPlan(
  overrides?: Partial<VideoPlan>
): VideoPlan {
  return {
    title: "サンプル商品レビュー",
    style: "ugc",
    duration: 15,
    timeline: [
      { second: "0-3", scene: "問題提起", text: "知らないと損" },
      { second: "3-10", scene: "商品紹介", text: "特徴説明" },
      { second: "10-15", scene: "CTA", text: "プロフィールへ" },
    ],
    ...overrides,
  };
}

export function videoPlanToStructureText(plan: VideoPlan): string {
  return plan.timeline
    .map((t) => `${t.second}秒: ${t.scene} — ${t.text}`)
    .join("\n");
}

function inferDurationFromTimeline(
  timeline: VideoPlanTimelineItem[]
): number | null {
  if (!timeline.length) return null;
  const last = timeline[timeline.length - 1]?.second || "";
  const range = last.match(/(\d+)\s*[-〜~–]\s*(\d+)/);
  if (range) return Number(range[2]);
  const m = last.match(/(\d+)\s*$/);
  if (m) return Number(m[1]);
  return null;
}

function rescaleTimeline(
  timeline: VideoPlanTimelineItem[],
  duration: number
): VideoPlanTimelineItem[] {
  const n = timeline.length;
  if (n === 0) return [];
  const lastEnd = inferDurationFromTimeline(timeline);
  if (lastEnd === duration) return timeline;

  const slots = allocateSceneSeconds(duration, n);
  return timeline.map((item, i) => ({
    ...item,
    second: slots[i]?.second ?? item.second,
  }));
}

function defaultIdeaTimeline(
  idea: VideoIdea,
  duration: number
): VideoPlanTimelineItem[] {
  return formatDefaultScenes(
    [
      { scene: "Hook", text: idea.hook },
      { scene: "商品説明", text: idea.concept },
      { scene: "メリット", text: idea.reason.slice(0, 40) },
      { scene: "CTA", text: idea.cta },
    ],
    duration
  );
}

function formatDefaultScenes(
  scenes: { scene: string; text: string }[],
  duration: number
): VideoPlanTimelineItem[] {
  const slots = allocateSceneSeconds(duration, scenes.length);
  return scenes.map((s, i) => ({
    second: slots[i]?.second ?? "0-0",
    scene: s.scene,
    text: s.text,
  }));
}

function defaultTimeline(
  duration: number,
  brief?: AiPlanBrief | null,
  analysis?: AnalysisResult | null
): VideoPlanTimelineItem[] {
  const hook =
    brief?.firstThreeSeconds || analysis?.hook || "冒頭で特徴を見せる";
  const mid =
    analysis?.sellingPoints?.[0] ||
    brief?.reason?.slice(0, 40) ||
    "特徴説明";
  const cta = brief?.cta || analysis?.cta || "プロフィールからチェック";

  return formatDefaultScenes(
    [
      { scene: "問題提起", text: hook.slice(0, 40) },
      { scene: "商品紹介", text: mid.slice(0, 40) },
      { scene: "CTA", text: cta.slice(0, 40) },
    ],
    duration
  );
}

function buildTimelineFromStructure(
  briefStructure: string | null | undefined,
  analysisStructure: string[] | null | undefined,
  duration: number,
  brief?: AiPlanBrief | null,
  analysis?: AnalysisResult | null
): VideoPlanTimelineItem[] | null {
  const timedLines = briefStructure?.trim()
    ? briefStructure
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : null;

  if (timedLines && timedLines.some((l) => /\d+\s*[-〜~–]\s*\d+/.test(l))) {
    return timedLines.map((line) => {
      const m = line.match(/(\d+)\s*[-〜~–]\s*(\d+)/);
      const text = line
        .replace(/^\d+\s*[-〜~–]\s*\d+\s*秒?[:：]?\s*/, "")
        .trim();
      const parts = text.split(/[—–\-：:]/).map((s) => s.trim()).filter(Boolean);
      return {
        second: m ? `${m[1]}-${m[2]}` : "0-0",
        scene: parts[0] || "シーン",
        text: (parts.slice(1).join(" ") || text).slice(0, 60),
      };
    });
  }

  const lines = timedLines || analysisStructure?.filter(Boolean) || null;
  if (!lines || lines.length === 0) return null;

  const slots = allocateSceneSeconds(duration, lines.length);
  return lines.map((line, i) => {
    const parsed = parseSceneLine(line);
    return {
      second: slots[i]?.second ?? `${i}`,
      scene: parsed.scene,
      text: (
        parsed.text ||
        (i === 0
          ? brief?.firstThreeSeconds || analysis?.hook || line
          : i === lines.length - 1
            ? brief?.cta || analysis?.cta || line
            : line)
      ).slice(0, 60),
    };
  });
}

function parseSceneLine(line: string): { scene: string; text: string } {
  const cleaned = line.replace(/^\d+[-〜~–]\d+秒?[:：\s]*/, "").trim();
  const parts = cleaned.split(/[—–\-：:]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { scene: parts[0], text: parts.slice(1).join(" ") };
  }
  if (/問題|フック|冒頭|Hook/i.test(cleaned)) {
    return { scene: "Hook", text: cleaned };
  }
  if (/CTA|行動|プロフ|リンク/.test(cleaned)) {
    return { scene: "CTA", text: cleaned };
  }
  if (/Before|After|比較|紹介|特徴|メリット/.test(cleaned)) {
    return { scene: "商品説明", text: cleaned };
  }
  return { scene: "シーン", text: cleaned || line };
}
