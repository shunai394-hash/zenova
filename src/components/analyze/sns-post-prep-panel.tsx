"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildSnsPostKit,
  type SnsPostKit,
} from "@/lib/analyze/sns-post-copy";
import type { VideoPreviewPayload } from "@/lib/analyze/preview-session";

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

function CopyField({
  label,
  value,
  rows = 4,
  onChange,
  onCopied,
}: {
  label: string;
  value: string;
  rows?: number;
  onChange: (next: string) => void;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <button
          type="button"
          onClick={() => {
            void (async () => {
              const ok = await copyText(value);
              if (!ok) return;
              setCopied(true);
              onCopied?.();
              window.setTimeout(() => setCopied(false), 1500);
            })();
          }}
          className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] text-gray-300 hover:bg-zinc-800"
        >
          {copied ? "コピー成功" : "コピー"}
        </button>
      </div>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-xl bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-zinc-800 focus:ring-zinc-500"
      />
    </div>
  );
}

type TabId = "tiktok" | "youtube" | "reels";

const TABS: { id: TabId; label: string }[] = [
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube Shorts" },
  { id: "reels", label: "Instagram Reels" },
];

/**
 * 生成動画 → 投稿文 → 投稿準備までを完結させるパネル
 */
export function SnsPostPrepPanel({
  payload,
}: {
  payload: VideoPreviewPayload;
}) {
  const initial = useMemo(() => buildSnsPostKit(payload), [payload]);
  const [kit, setKit] = useState<SnsPostKit>(initial);
  const [tab, setTab] = useState<TabId>("tiktok");
  const [bundleCopied, setBundleCopied] = useState(false);
  const [generatedAt] = useState(() => new Date());
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // フック/CTA改善で payload が変わったら再生成
  useEffect(() => {
    setKit(buildSnsPostKit(payload));
  }, [payload]);

  const showCopySuccess = (message: string) => {
    setCopySuccess(message);
    window.setTimeout(() => setCopySuccess(null), 2000);
  };

  const copyBundle = async () => {
    let text = "";
    if (tab === "tiktok") text = kit.tiktok.fullPost;
    else if (tab === "youtube") {
      text = `【タイトル】\n${kit.youtubeShorts.title}\n\n【説明】\n${kit.youtubeShorts.description}`;
    } else {
      text = kit.instagramReels.fullPost;
    }
    const ok = await copyText(text);
    if (!ok) return;
    setBundleCopied(true);
    showCopySuccess("コピーしました");
    window.setTimeout(() => setBundleCopied(false), 1500);
  };

  const generatedAtLabel = generatedAt.toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">投稿準備</h2>
          <p className="mt-1 text-xs text-gray-500">
            キャプション・タグ・タイトルを生成。SNSごとにコピーして投稿できます
          </p>
          <p className="mt-2 text-[11px] text-gray-600">
            投稿コピー生成日時: {generatedAtLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setKit(buildSnsPostKit(payload))}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-zinc-800"
        >
          文章を再生成
        </button>
      </div>

      {copySuccess && (
        <div
          className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-2.5 text-sm text-emerald-200"
          role="status"
        >
          {copySuccess}
        </div>
      )}

      {/* AI生成キャプション（共通） */}
      <div className="mt-5">
        <CopyField
          label="AI生成キャプション"
          value={kit.caption}
          rows={5}
          onChange={(caption) => setKit((k) => ({ ...k, caption }))}
          onCopied={() => showCopySuccess("キャプションをコピーしました")}
        />
      </div>

      {/* SNSタブ */}
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setBundleCopied(false);
            }}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "border-white bg-white text-black"
                : "border-zinc-700 bg-zinc-900 text-gray-300 hover:border-zinc-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3 rounded-xl border border-zinc-800 bg-black/40 p-4">
        {tab === "tiktok" && (
          <>
            <CopyField
              label="TikTokキャプション"
              value={kit.tiktok.caption}
              rows={5}
              onCopied={() => showCopySuccess("コピーしました")}
              onChange={(caption) =>
                setKit((k) => ({
                  ...k,
                  tiktok: {
                    ...k.tiktok,
                    caption,
                    fullPost: `${caption}\n\n${k.tiktok.hashtags}`,
                  },
                }))
              }
            />
            <CopyField
              label="TikTok用ハッシュタグ"
              value={kit.tiktok.hashtags}
              rows={2}
              onCopied={() => showCopySuccess("コピーしました")}
              onChange={(hashtags) =>
                setKit((k) => ({
                  ...k,
                  tiktok: {
                    ...k.tiktok,
                    hashtags,
                    fullPost: `${k.tiktok.caption}\n\n${hashtags}`,
                  },
                }))
              }
            />
          </>
        )}

        {tab === "youtube" && (
          <>
            <CopyField
              label="YouTube Shorts用タイトル"
              value={kit.youtubeShorts.title}
              rows={2}
              onCopied={() => showCopySuccess("コピーしました")}
              onChange={(title) =>
                setKit((k) => ({
                  ...k,
                  youtubeShorts: { ...k.youtubeShorts, title },
                }))
              }
            />
            <CopyField
              label="説明文（任意）"
              value={kit.youtubeShorts.description}
              rows={5}
              onCopied={() => showCopySuccess("コピーしました")}
              onChange={(description) =>
                setKit((k) => ({
                  ...k,
                  youtubeShorts: { ...k.youtubeShorts, description },
                }))
              }
            />
          </>
        )}

        {tab === "reels" && (
          <>
            <CopyField
              label="Instagram Reels用説明文"
              value={kit.instagramReels.description}
              rows={6}
              onCopied={() => showCopySuccess("コピーしました")}
              onChange={(description) =>
                setKit((k) => ({
                  ...k,
                  instagramReels: {
                    ...k.instagramReels,
                    description,
                    fullPost: description,
                  },
                }))
              }
            />
            <CopyField
              label="ハッシュタグ"
              value={kit.instagramReels.hashtags}
              rows={2}
              onCopied={() => showCopySuccess("コピーしました")}
              onChange={(hashtags) =>
                setKit((k) => ({
                  ...k,
                  instagramReels: { ...k.instagramReels, hashtags },
                }))
              }
            />
          </>
        )}

        <button
          type="button"
          onClick={() => void copyBundle()}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
        >
          {bundleCopied
            ? "コピー成功 ✓"
            : `${TABS.find((t) => t.id === tab)?.label}用をまとめてコピー`}
        </button>
      </div>
    </section>
  );
}
