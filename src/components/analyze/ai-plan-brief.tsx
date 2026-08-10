"use client";

import { useState } from "react";
import {
  AI_PLAN_BRIEF_FIELDS,
  type AiPlanBrief,
} from "@/lib/analyze/plan-brief";

const inputClassName =
  "w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm text-white outline-none ring-1 ring-zinc-800 focus:ring-zinc-500 disabled:opacity-50 resize-y";

async function copyText(value: string): Promise<boolean> {
  const text = value.trim();
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function PlanCard({
  label,
  hint,
  value,
  rows,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  rows: number;
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <article className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{label}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void (async () => {
              const ok = await copyText(value);
              if (!ok) return;
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            })();
          }}
          className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-gray-300 hover:bg-zinc-800"
        >
          {copied ? "コピー済み" : "コピー"}
        </button>
      </div>
      <textarea
        rows={rows}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />
    </article>
  );
}

/**
 * 分析結果を「AI企画書」としてカード表示（編集・コピー可）。
 */
export function AiPlanBriefPanel({
  brief,
  onChange,
  disabled,
}: {
  brief: AiPlanBrief;
  onChange: (next: AiPlanBrief) => void;
  disabled?: boolean;
}) {
  const [allCopied, setAllCopied] = useState(false);

  const copyAll = async () => {
    const text = AI_PLAN_BRIEF_FIELDS.map(
      (f) => `【${f.label}】\n${brief[f.key].trim()}`
    ).join("\n\n");
    const ok = await copyText(text);
    if (!ok) return;
    setAllCopied(true);
    window.setTimeout(() => setAllCopied(false), 1500);
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">企画内容</h3>
          <p className="mt-1 text-xs text-gray-500">
            各カードは編集・コピーできます。内容は動画生成に反映されます。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copyAll()}
          className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-gray-300 hover:bg-zinc-800"
        >
          {allCopied ? "企画書をコピー済み" : "企画書をすべてコピー"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {AI_PLAN_BRIEF_FIELDS.map((field) => (
          <PlanCard
            key={field.key}
            label={field.label}
            hint={field.hint}
            value={brief[field.key]}
            rows={field.rows}
            disabled={disabled}
            onChange={(next) => onChange({ ...brief, [field.key]: next })}
          />
        ))}
      </div>
    </div>
  );
}
