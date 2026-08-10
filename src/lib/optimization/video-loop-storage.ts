/**
 * 投稿結果・改善ループのローカル保存
 *（DBカラム追加までのクライアント側永続化）
 */

import type {
  ImprovementRecord,
  NextVideoIdea,
  OptimizationReflection,
  PostResultMetrics,
  VideoLoopStatus,
} from "@/lib/ai-optimization-engine";

export const VIDEO_LOOP_STORAGE_KEY = "zenova_video_loop_v1";

export type VideoLoopLocalRecord = {
  videoId: string;
  postStatus: VideoLoopStatus;
  postResult?: PostResultMetrics | null;
  reflection?: OptimizationReflection | null;
  improvement?: ImprovementRecord | null;
  nextIdeas?: NextVideoIdea[] | null;
  updatedAt: string;
};

type LoopStore = Record<string, VideoLoopLocalRecord>;

function readStore(): LoopStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VIDEO_LOOP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LoopStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: LoopStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VIDEO_LOOP_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota
  }
}

export function loadVideoLoopRecord(
  videoId: string
): VideoLoopLocalRecord | null {
  if (!videoId) return null;
  return readStore()[videoId] || null;
}

export function loadAllVideoLoopRecords(): LoopStore {
  return readStore();
}

export function saveVideoLoopRecord(
  record: VideoLoopLocalRecord
): VideoLoopLocalRecord {
  const store = readStore();
  const next: VideoLoopLocalRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
  };
  store[record.videoId] = next;
  writeStore(store);
  return next;
}

export function upsertVideoLoopStatus(
  videoId: string,
  postStatus: VideoLoopStatus
): VideoLoopLocalRecord {
  const prev = loadVideoLoopRecord(videoId);
  return saveVideoLoopRecord({
    videoId,
    postStatus,
    postResult: prev?.postResult ?? null,
    reflection: prev?.reflection ?? null,
    improvement: prev?.improvement ?? null,
    nextIdeas: prev?.nextIdeas ?? null,
    updatedAt: new Date().toISOString(),
  });
}

export function resolveLoopStatus(
  videoId: string,
  dbStatus?: string | null
): VideoLoopStatus {
  const local = loadVideoLoopRecord(videoId);
  if (local?.postStatus) return local.postStatus;

  const key = (dbStatus || "").trim().toLowerCase();
  if (key === "improving" || key === "改善中") return "improving";
  if (
    key === "posted" ||
    key === "published" ||
    key === "投稿済み" ||
    key.includes("post")
  ) {
    return "posted";
  }
  if (
    key === "scheduled" ||
    key === "planned" ||
    key === "投稿予定"
  ) {
    return "scheduled";
  }
  return "created";
}
