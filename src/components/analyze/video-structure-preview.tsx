"use client";

import { buildStructureBeats } from "@/lib/analyze/structure-preview";
import type { AiPlanBrief } from "@/lib/analyze/plan-brief";
import type { VideoSettings } from "@/lib/analyze/video-settings";

/** 動画構成プレビュー（タイムライン） */
export function VideoStructurePreview({
  brief,
  settings,
}: {
  brief: AiPlanBrief;
  settings?: VideoSettings | null;
}) {
  const beats = buildStructureBeats({ brief, settings });
  const duration = settings?.duration_sec ?? 15;

  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-white">
            動画構成プレビュー
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            生成される動画の流れ（約{duration}秒）
          </p>
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {beats.map((beat) => (
          <li
            key={`${beat.index}-${beat.label}`}
            className="flex gap-3 rounded-xl border border-zinc-800 bg-black/40 p-3 sm:p-4"
          >
            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-zinc-800 text-center">
              <span className="text-[10px] text-gray-500">#{beat.index}</span>
              <span className="text-[10px] font-medium text-emerald-400">
                {beat.startSec}–{beat.endSec}s
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{beat.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-400">
                {beat.text}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {/* 簡易タイムラインバー */}
      <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-zinc-800">
        {beats.map((beat, i) => (
          <div
            key={beat.index}
            className={`h-full ${
              i % 2 === 0 ? "bg-emerald-500/70" : "bg-emerald-700/50"
            }`}
            style={{
              width: `${Math.max(
                8,
                ((beat.endSec - beat.startSec) / duration) * 100
              )}%`,
            }}
            title={`${beat.label} ${beat.startSec}–${beat.endSec}s`}
          />
        ))}
      </div>
    </div>
  );
}
