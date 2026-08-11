"use client";

import {
  PLAN_VARIANT_TABS,
  type PlanVariantId,
} from "@/lib/analyze/plan-variants";

/** 形式別企画タブ（UGC / レビュー / BA / 広告 / 比較 / ランキング） */
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
        <h3 className="text-base font-semibold text-white">形式別企画</h3>
        <p className="mt-1 text-xs text-gray-500">
          形式を切り替えるとシーン構成も変わります（選択中の企画が動画生成へ引き継がれます）
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
