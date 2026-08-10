/**
 * 履歴カードの表示ステータス（運用ループ）
 *
 * 作成済み → 投稿予定 → 投稿済み → 改善中
 */

import type { VideoLoopStatus } from "@/lib/ai-optimization-engine";

/** @deprecated 互換用。新規は VideoLoopStatus を使う */
export type HistoryDisplayStatus =
  | "generated"
  | "posted"
  | "editing"
  | VideoLoopStatus;

export function resolveHistoryDisplayStatus(
  raw: string | null | undefined
): HistoryDisplayStatus {
  const key = (raw || "").trim().toLowerCase();
  if (key === "improving" || key === "改善中") return "improving";
  if (
    key === "scheduled" ||
    key === "planned" ||
    key === "投稿予定"
  ) {
    return "scheduled";
  }
  if (
    key === "posted" ||
    key === "published" ||
    key === "投稿済み" ||
    key.includes("post")
  ) {
    return "posted";
  }
  if (
    key === "editing" ||
    key === "draft" ||
    key === "pending" ||
    key === "processing" ||
    key === "編集中"
  ) {
    return "editing";
  }
  if (key === "created" || key === "作成済み") return "created";
  // completed / ready / 生成済み
  return "created";
}

export function getHistoryStatusLabel(
  status: HistoryDisplayStatus | VideoLoopStatus
): string {
  switch (status) {
    case "scheduled":
      return "投稿予定";
    case "posted":
      return "投稿済み";
    case "improving":
      return "改善中";
    case "editing":
      return "編集中";
    case "generated":
      return "生成済み";
    case "created":
    default:
      return "作成済み";
  }
}

export function getHistoryStatusClass(
  status: HistoryDisplayStatus | VideoLoopStatus
): string {
  switch (status) {
    case "scheduled":
      return "border-sky-500/40 bg-sky-950/40 text-sky-200";
    case "posted":
      return "border-emerald-500/40 bg-emerald-950/40 text-emerald-300";
    case "improving":
      return "border-violet-500/40 bg-violet-950/40 text-violet-200";
    case "editing":
      return "border-amber-500/40 bg-amber-950/30 text-amber-200";
    case "generated":
    case "created":
    default:
      return "border-zinc-600 bg-zinc-950 text-gray-300";
  }
}

export const LOOP_STATUS_FLOW: VideoLoopStatus[] = [
  "created",
  "scheduled",
  "posted",
  "improving",
];
