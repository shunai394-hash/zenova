"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import {
  buildAnalyzeDemoHref,
  DEMO_COMPOSITIONS,
  DEMO_SECTION_SUBTITLE,
  DEMO_SECTION_TITLE,
  type DemoCompositionItem,
} from "@/lib/landing/demo-compositions";

function PlayIcon({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border border-white/40 bg-black/55 shadow-lg backdrop-blur-sm ${className ?? ""}`}
    >
      <div className="ml-1 h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-white" />
    </div>
  );
}

function DemoCard({
  demo,
  onOpen,
}: {
  demo: DemoCompositionItem;
  onOpen: (demo: DemoCompositionItem) => void;
}) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition duration-300 hover:scale-[1.02] hover:border-zinc-600">
      <button
        type="button"
        onClick={() => onOpen(demo)}
        className="relative block w-full aspect-[9/14] overflow-hidden bg-gradient-to-b from-zinc-800 via-zinc-900 to-black text-left sm:aspect-video"
        aria-label={`${demo.title}をプレビュー`}
      >
        {demo.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={demo.thumbnail}
            alt={demo.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b ${demo.accent} px-4 text-center`}
          >
            <span className="rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-medium tracking-wide text-emerald-300">
              AI生成デモ
            </span>
            <span className="text-sm font-medium text-gray-200">
              {demo.title}
            </span>
            <span className="text-[10px] tracking-[0.2em] text-gray-600">
              ZENOVA ORIGINAL
            </span>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center opacity-90 transition group-hover:opacity-100">
          <PlayIcon className="h-14 w-14" />
        </div>

        <span className="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-0.5 text-[11px] font-medium text-gray-200">
          {demo.duration}
        </span>
      </button>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{demo.title}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
            {demo.description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpen(demo)}
          className="w-full rounded-xl border border-zinc-700 px-3 py-2 text-xs text-gray-200 transition hover:bg-zinc-800"
        >
          プレビューを見る
        </button>
        <Link
          href={buildAnalyzeDemoHref(demo.templateKey)}
          className="inline-flex w-full items-center justify-center rounded-xl bg-white px-3 py-2.5 text-center text-xs font-semibold text-black transition hover:bg-gray-200"
        >
          この構成で動画を作る
        </Link>
      </div>
    </article>
  );
}

function DemoPreviewModal({
  demo,
  onClose,
}: {
  demo: DemoCompositionItem;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3 sm:px-5">
          <div>
            <h3 id={titleId} className="text-base font-semibold text-white">
              {demo.title}
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              Zenova AI生成デモ · {demo.duration}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-2.5 py-1 text-sm text-gray-300 hover:bg-zinc-800"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="relative aspect-video bg-black">
          {demo.videoUrl ? (
            <video
              key={demo.videoUrl}
              src={demo.videoUrl}
              poster={demo.thumbnail ?? undefined}
              controls
              playsInline
              autoPlay
              className="h-full w-full object-contain"
            />
          ) : demo.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={demo.thumbnail}
              alt={demo.title}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-900 to-black px-6 text-center">
              <PlayIcon className="h-16 w-16 opacity-60" />
              <p className="text-sm text-gray-400">
                デモ動画は準備中です。ファイル差し替え後に再生されます。
              </p>
              <p className="text-xs text-gray-600">
                例: public/demos/{demo.id.replace("demo-", "")}.mp4
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 border-t border-zinc-800 px-4 py-4 sm:px-5">
          <div>
            <p className="text-xs font-medium text-gray-500">
              Zenovaオリジナル構成
            </p>
            <ol className="mt-3 space-y-2">
              {demo.composition.map((beat) => (
                <li
                  key={`${beat.timing}-${beat.title}`}
                  className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
                >
                  <span className="shrink-0 rounded bg-zinc-800 px-2 py-1 text-[10px] font-medium text-emerald-400">
                    {beat.timing}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {beat.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-400">
                      {beat.direction}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <Link
            href={buildAnalyzeDemoHref(demo.templateKey)}
            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            この構成で動画を作る
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * TOP「こんな動画が作れます」
 * データは DEMO_COMPOSITIONS（videoUrl / thumbnail 差し替え可）
 */
export function LandingSampleVideos() {
  const [active, setActive] = useState<DemoCompositionItem | null>(null);

  return (
    <section className="border-y border-zinc-900 bg-zinc-950/40 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {DEMO_SECTION_TITLE}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-400 sm:text-base">
            {DEMO_SECTION_SUBTITLE}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_COMPOSITIONS.map((demo) => (
            <DemoCard key={demo.id} demo={demo} onOpen={setActive} />
          ))}
        </div>
      </div>

      {active && (
        <DemoPreviewModal demo={active} onClose={() => setActive(null)} />
      )}
    </section>
  );
}
