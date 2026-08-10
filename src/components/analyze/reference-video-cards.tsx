"use client";

import { useState } from "react";
import {
  REFERENCE_VIDEOS,
  type ReferenceVideoCard,
} from "@/lib/analyze/reference-videos";

function RefCard({ item }: { item: ReferenceVideoCard }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block w-full aspect-video bg-gradient-to-br from-zinc-800 via-zinc-900 to-black text-left"
        aria-label={`${item.title}を見る`}
      >
        {item.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs tracking-widest text-gray-600">
              REFERENCE
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-zinc-900/90 px-2 py-0.5 text-[10px] font-medium text-gray-200">
          {item.style}
        </span>
        <span className="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-0.5 text-[11px] text-gray-200">
          {item.duration}
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-black/50">
            <div className="ml-0.5 h-0 w-0 border-y-[8px] border-l-[12px] border-y-transparent border-l-white" />
          </div>
        </div>
      </button>
      <div className="p-3">
        <h4 className="text-sm font-semibold text-white">{item.title}</h4>
        <p className="mt-1 text-xs text-gray-500">{item.category}</p>
        <p className="mt-2 text-xs leading-relaxed text-gray-400">
          {item.reason}
        </p>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-700 px-2 py-1 text-sm text-gray-300"
              >
                ×
              </button>
            </div>
            <div className="relative aspect-video bg-black">
              {item.videoUrl ? (
                <video
                  src={item.videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <p className="text-sm text-gray-400">
                    参考動画はダミーです。実動画差し替え時に再生されます。
                  </p>
                  <p className="text-xs text-gray-600">
                    {item.style} · {item.category}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/** 参考動画カード（ダミー可） */
export function ReferenceVideoCards() {
  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      <h3 className="text-base font-semibold text-white">参考動画</h3>
      <p className="mt-1 text-xs text-gray-500">
        同系統で伸びやすい構成の参考例です（現在はデモデータ）
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {REFERENCE_VIDEOS.map((item) => (
          <RefCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
