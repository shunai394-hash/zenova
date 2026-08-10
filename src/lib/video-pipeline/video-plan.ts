import type { AiPlanBrief } from "@/lib/analyze/plan-brief";
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
    cta: input.cta?.trim() || input.brief?.cta?.trim() || input.analysis?.cta || "詳細を見る",
  };
}

/**
 * VideoIdea 選択 → VideoPlan 生成
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
  // 標準: 0-3 Hook / 3-10 説明 / 10-20 メリット / 20-30 CTA（尺に比例）
  if (n === 4 && duration >= 20) {
    const marks = [
      0,
      Math.round(duration * 0.1),
      Math.round(duration * 0.33),
      Math.round(duration * 0.67),
      duration,
    ];
    return timeline.map((item, i) => ({
      ...item,
      second: `${marks[i]}-${marks[i + 1]}`,
    }));
  }
  const slice = duration / n;
  return timeline.map((item, i) => {
    const start = Math.floor(i * slice);
    const end = i === n - 1 ? duration : Math.floor((i + 1) * slice);
    return { ...item, second: `${start}-${end}` };
  });
}

function defaultIdeaTimeline(
  idea: VideoIdea,
  duration: number
): VideoPlanTimelineItem[] {
  const hookEnd = Math.min(3, Math.floor(duration * 0.1));
  const descEnd = Math.max(hookEnd + 1, Math.floor(duration * 0.33));
  const meritEnd = Math.max(descEnd + 1, Math.floor(duration * 0.67));
  return [
    { second: `0-${hookEnd}`, scene: "Hook", text: idea.hook },
    {
      second: `${hookEnd}-${descEnd}`,
      scene: "商品説明",
      text: idea.concept,
    },
    {
      second: `${descEnd}-${meritEnd}`,
      scene: "メリット",
      text: idea.reason.slice(0, 40),
    },
    {
      second: `${meritEnd}-${duration}`,
      scene: "CTA",
      text: idea.cta,
    },
  ];
}

function defaultTimeline(
  duration: number,
  brief?: AiPlanBrief | null,
  analysis?: AnalysisResult | null
): VideoPlanTimelineItem[] {
  const hook = brief?.firstThreeSeconds || analysis?.hook || "知らないと損";
  const mid =
    analysis?.sellingPoints?.[0] ||
    brief?.reason?.slice(0, 40) ||
    "特徴説明";
  const cta = brief?.cta || analysis?.cta || "プロフィールからチェック";

  if (duration <= 15) {
    return [
      { second: "0-3", scene: "問題提起", text: hook.slice(0, 40) },
      { second: "3-10", scene: "商品紹介", text: mid.slice(0, 40) },
      { second: "10-15", scene: "CTA", text: cta.slice(0, 40) },
    ];
  }

  const midEnd = Math.max(12, Math.floor(duration * 0.7));
  return [
    { second: "0-3", scene: "問題提起", text: hook.slice(0, 40) },
    { second: `3-${midEnd}`, scene: "商品紹介", text: mid.slice(0, 40) },
    {
      second: `${midEnd}-${duration}`,
      scene: "CTA",
      text: cta.slice(0, 40),
    },
  ];
}

function buildTimelineFromStructure(
  briefStructure: string | null | undefined,
  analysisStructure: string[] | null | undefined,
  duration: number,
  brief?: AiPlanBrief | null,
  analysis?: AnalysisResult | null
): VideoPlanTimelineItem[] | null {
  const lines =
    (briefStructure?.trim()
      ? briefStructure.split("\n").map((l) => l.trim()).filter(Boolean)
      : null) ||
    analysisStructure?.filter(Boolean) ||
    null;

  if (!lines || lines.length === 0) return null;

  const n = lines.length;
  const slice = duration / n;
  return lines.map((line, i) => {
    const start = Math.floor(i * slice);
    const end = i === n - 1 ? duration : Math.floor((i + 1) * slice);
    const parsed = parseSceneLine(line);
    return {
      second: `${start}-${end}`,
      scene: parsed.scene,
      text:
        parsed.text ||
        (i === 0
          ? brief?.firstThreeSeconds || analysis?.hook || line
          : i === n - 1
            ? brief?.cta || analysis?.cta || line
            : line
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
