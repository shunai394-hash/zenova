"use client";

import { useEffect, useState } from "react";
import {
  GENERATE_PROGRESS_STAGES,
  type GeneratePhase,
} from "@/lib/analyze/workspace";
import {
  getSpeakerLabel,
  getVideoStyleLabel,
  type VideoSettings,
} from "@/lib/analyze/video-settings";
import type { GenerationStatus } from "@/lib/video-pipeline";
import {
  GENERATION_STATUS_FLOW,
  getGenerationStatusLabel,
  generationStatusIndex,
} from "@/lib/video-pipeline";

function formatSpeakerPreview(speaker: VideoSettings["speaker"]): string {
  const label = getSpeakerLabel(speaker);
  if (speaker === "ai") return label;
  return `${label}ナレーション`;
}

/**
 * 生成直前の確認 + 生成中プログレス。
 */
export function GenerationPreview({
  settings,
  phase,
  generationStatus = "idle",
  canGenerate,
  disabled,
  onGenerate,
  imageWarning,
  errorMessage,
  prepMessage,
}: {
  settings: VideoSettings;
  phase: GeneratePhase;
  generationStatus?: GenerationStatus;
  canGenerate: boolean;
  disabled?: boolean;
  onGenerate: () => void;
  imageWarning?: string | null;
  errorMessage?: string | null;
  /** 課金通過後・エンジン未接続時の案内 */
  prepMessage?: string | null;
}) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (phase !== "generating") {
      setStageIndex(0);
      return;
    }

    // 実ステータスが届いた場合だけステージを進める。
    // 経過時間からバックエンド状態を推測すると、実際より先に
    // 「完了」に見えてしまうため、推測値は表示しない。
    const fromStatus = generationStatusIndex(generationStatus);
    setStageIndex(
      fromStatus >= 0 && generationStatus !== "idle"
        ? Math.min(fromStatus, GENERATE_PROGRESS_STAGES.length - 1)
        : 0
    );
  }, [phase, generationStatus]);

  if (phase === "complete") return null;

  if (generationStatus === "failed" && errorMessage) {
    return (
      <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-950/20 p-5 sm:p-6">
        <h3 className="text-base font-semibold text-red-200">生成に失敗しました</h3>
        <p className="mt-2 text-sm leading-relaxed text-red-100/90">
          {errorMessage}
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled || !canGenerate}
          className="mt-5 w-full rounded-xl bg-white px-5 py-4 text-base font-semibold text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          もう一度 AI動画を作成する
        </button>
      </div>
    );
  }

  if (phase === "generating") {
    const hasMeasuredStatus =
      generationStatus !== "idle" &&
      generationStatusIndex(generationStatus) >= 0;
    const pct = hasMeasuredStatus
      ? Math.round(
          ((stageIndex + 1) / GENERATE_PROGRESS_STAGES.length) * 100
        )
      : null;
    return (
      <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/15 p-5 sm:p-6">
        <h3 className="text-base font-semibold text-amber-100">
          AI動画を作成中...
        </h3>
        <p className="mt-1 text-xs text-amber-200/70">
          {hasMeasuredStatus
            ? getGenerationStatusLabel(generationStatus)
            : "サーバーで生成処理を実行しています"}
          {" — "}
          完了まで数十秒〜数分かかることがあります
        </p>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={
              hasMeasuredStatus
                ? "h-full rounded-full bg-amber-400 transition-all duration-700"
                : "h-full w-1/3 animate-pulse rounded-full bg-amber-400"
            }
            style={hasMeasuredStatus ? { width: `${pct}%` } : undefined}
          />
        </div>

        <ol className="mt-5 space-y-3">
          {GENERATE_PROGRESS_STAGES.map((stage, i) => {
            const done = i < stageIndex;
            const active = i === stageIndex;
            const statusKey = GENERATION_STATUS_FLOW[i];
            return (
              <li
                key={stage.id}
                className={`flex items-center gap-3 text-sm ${
                  active
                    ? "font-medium text-amber-100"
                    : done
                      ? "text-emerald-400"
                      : "text-gray-600"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-[10px]">
                  {done ? "✓" : active ? "…" : i + 1}
                </span>
                <span>
                  {statusKey
                    ? getGenerationStatusLabel(statusKey)
                    : stage.label}
                </span>
                {active && i < GENERATE_PROGRESS_STAGES.length - 1 && (
                  <span className="ml-auto text-xs text-amber-200/60">進行中</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  const lines = [
    `約${settings.duration_sec}秒`,
    getVideoStyleLabel(settings.video_style),
    formatSpeakerPreview(settings.speaker),
    settings.captions_enabled ? "字幕ON" : "字幕OFF",
  ];

  return (
    <div className="mt-6 rounded-2xl border border-zinc-700 bg-black/50 p-5 sm:p-6">
      <h3 className="text-sm font-semibold tracking-wide text-gray-300">
        生成イメージ
      </h3>

      <div className="mt-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/80 px-5 py-6 text-center">
        <p className="text-sm text-gray-400">この動画は</p>
        <ul className="mt-4 space-y-2">
          {lines.map((line) => (
            <li
              key={line}
              className="text-lg font-semibold tracking-tight text-white sm:text-xl"
            >
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-gray-400">で生成されます</p>
      </div>

      {imageWarning && (
        <p className="mt-3 text-sm text-amber-300/90">{imageWarning}</p>
      )}

      {prepMessage && (
        <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
          {prepMessage}
        </div>
      )}

      <button
        type="button"
        onClick={onGenerate}
        disabled={disabled || !canGenerate}
        className="mt-5 w-full rounded-xl bg-white px-5 py-4 text-base font-semibold text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        この内容で動画を生成する
      </button>
      <p className="mt-2 text-center text-xs text-gray-600">
        有料プランで月間の生成枠内であれば次のステップへ進みます
      </p>
    </div>
  );
}
