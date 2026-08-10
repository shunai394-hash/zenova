"use client";

import {
  PLAN_VARIANT_TABS,
  type PlanVariantId,
} from "@/lib/analyze/plan-variants";

/** Sprint 3: AI別案タブ（比較 / UGC / ランキング） */
export function PlanVariantTabs({
  active,
  onChange,
  disabled,
}: {
  active: PlanVariantId;
  onChange: (id: PlanVariantId) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      <div>
        <h3 className="text-base font-semibold text-white">AI別案</h3>
        <p className="mt-1 text-xs text-gray-500">
          比較・UGC・ランキングの企画を切り替えて試せます（動画スタイルも連動）
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {PLAN_VARIANT_TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(tab.id)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:opacity-40 ${
                selected
                  ? "border-white bg-white text-black"
                  : "border-zinc-700 bg-zinc-950 text-gray-300 hover:border-zinc-500"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
