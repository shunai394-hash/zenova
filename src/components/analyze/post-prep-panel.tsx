"use client";

import { useState } from "react";
import type { PostPrepSet } from "@/lib/analyze/post-prep";

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

function PrepField({
  label,
  value,
  rows,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{label}</p>
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
          className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-gray-300 hover:bg-zinc-800"
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
    </div>
  );
}

/** Sprint 1: 投稿準備セット */
export function PostPrepPanel({
  prep,
  onChange,
  disabled,
}: {
  prep: PostPrepSet;
  onChange: (next: PostPrepSet) => void;
  disabled?: boolean;
}) {
  const [allCopied, setAllCopied] = useState(false);

  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">投稿準備セット</h3>
          <p className="mt-1 text-xs text-gray-500">
            キャプション・タグ・投稿時間をコピーしてそのまま投稿できます
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void (async () => {
              const text = [
                "【キャプションA】",
                prep.captionA,
                "",
                "【キャプションB】",
                prep.captionB,
                "",
                "【ハッシュタグ】",
                prep.hashtags,
                "",
                "【投稿時間】",
                prep.postTime,
              ].join("\n");
              const ok = await copyText(text);
              if (!ok) return;
              setAllCopied(true);
              window.setTimeout(() => setAllCopied(false), 1500);
            })();
          }}
          className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-gray-300 hover:bg-zinc-800"
        >
          {allCopied ? "すべてコピー済み" : "すべてコピー"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PrepField
          label="キャプションA"
          value={prep.captionA}
          rows={6}
          disabled={disabled}
          onChange={(captionA) => onChange({ ...prep, captionA })}
        />
        <PrepField
          label="キャプションB"
          value={prep.captionB}
          rows={6}
          disabled={disabled}
          onChange={(captionB) => onChange({ ...prep, captionB })}
        />
        <PrepField
          label="ハッシュタグ"
          value={prep.hashtags}
          rows={3}
          disabled={disabled}
          onChange={(hashtags) => onChange({ ...prep, hashtags })}
        />
        <PrepField
          label="投稿時間"
          value={prep.postTime}
          rows={3}
          disabled={disabled}
          onChange={(postTime) => onChange({ ...prep, postTime })}
        />
      </div>
    </div>
  );
}
