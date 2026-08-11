"use client";

import type { PlanQualityResult } from "@/lib/analyze/plan-quality";

/** Sprint 2: AI品質スコア */
export function PlanQualityPanel({
  quality,
  onImprove,
  disabled,
}: {
  quality: PlanQualityResult;
  onImprove: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">AI品質スコア</h3>
          <p className="mt-1 text-xs text-gray-500">
            企画書の完成度（AI推定・参考値）。ワンクリックで改善できます
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tracking-tight text-white">
            {quality.score}
            <span className="ml-1 text-base font-medium text-gray-500">/100</span>
          </p>
          <p className="mt-1 text-sm text-emerald-400">
            Grade {quality.grade} · 参考
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            根拠
          </p>
          <ul className="mt-3 space-y-2 text-sm text-gray-300">
            {quality.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-emerald-400">✓</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            改善提案
          </p>
          {quality.improvements.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">
              十分な完成度です。このまま生成へ進めます。
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-gray-300">
              {quality.improvements.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-amber-300">→</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onImprove}
        disabled={disabled || quality.improvements.length === 0}
        className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ワンクリック改善
      </button>
    </div>
  );
}
