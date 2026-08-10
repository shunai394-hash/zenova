"use client";

import { useState } from "react";
import type { CreativeDraft } from "@/lib/analyze/creative-draft";

const inputClassName =
  "w-full rounded bg-zinc-950 px-4 py-3 text-white outline-none ring-1 ring-zinc-800 focus:ring-zinc-500 disabled:opacity-50";

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

function FieldHeader({
  label,
  hint,
  value = "",
  showCopy,
}: {
  label: string;
  hint?: string;
  value?: string;
  showCopy?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      </div>
      {showCopy && (
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
      )}
    </div>
  );
}

export function CreativeEditor({
  draft,
  onChange,
  disabled,
}: {
  draft: CreativeDraft;
  onChange: (next: CreativeDraft) => void;
  disabled?: boolean;
}) {
  const patch = (key: keyof CreativeDraft, value: string) => {
    onChange({ ...draft, [key]: value });
  };

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-zinc-700 bg-black/40 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-white">
          動画クリエイティブ（編集可）
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          AIの提案をベースに調整できます。動画生成時はこの内容が使われます。
        </p>
      </div>

      <div>
        <FieldHeader label="ターゲット層" hint="誰に向けた動画か" />
        <textarea
          rows={2}
          value={draft.target}
          disabled={disabled}
          onChange={(e) => patch("target", e.target.value)}
          className={`${inputClassName} resize-y`}
          placeholder="例: 通勤中の20代会社員"
        />
      </div>

      <div>
        <FieldHeader
          label="フック（最初の3秒）"
          hint="スクロールを止める冒頭セリフ・見せ方"
          value={draft.hook}
          showCopy
        />
        <textarea
          rows={2}
          value={draft.hook}
          disabled={disabled}
          onChange={(e) => patch("hook", e.target.value)}
          className={`${inputClassName} resize-y`}
          placeholder="例: これ使い始めてから、通勤が変わった"
        />
      </div>

      <div>
        <FieldHeader
          label="動画台本"
          hint="ナレーション／字幕の元になる台本"
          value={draft.script}
          showCopy
        />
        <textarea
          rows={8}
          value={draft.script}
          disabled={disabled}
          onChange={(e) => patch("script", e.target.value)}
          className={`${inputClassName} resize-y font-sans text-sm leading-relaxed`}
          placeholder="動画の台本を編集"
        />
      </div>

      <div>
        <FieldHeader label="CTA" hint="最後の行動誘導" value={draft.cta} showCopy />
        <textarea
          rows={2}
          value={draft.cta}
          disabled={disabled}
          onChange={(e) => patch("cta", e.target.value)}
          className={`${inputClassName} resize-y`}
          placeholder="例: 詳しくはプロフのリンクから"
        />
      </div>

      <div>
        <FieldHeader
          label="おすすめハッシュタグ"
          hint="投稿用。スペース区切り"
          value={draft.hashtags}
          showCopy
        />
        <textarea
          rows={2}
          value={draft.hashtags}
          disabled={disabled}
          onChange={(e) => patch("hashtags", e.target.value)}
          className={`${inputClassName} resize-y`}
          placeholder="#TikTok #おすすめ"
        />
      </div>
    </div>
  );
}
