"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  buildAnalyzeDemoHref,
  DEMO_COMPOSITIONS,
  DEMO_SECTION_SUBTITLE,
  DEMO_SECTION_TITLE,
  type DemoCompositionItem,
} from "@/lib/landing/demo-compositions";

function PlayMark() {
  return (
    <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-black/45 backdrop-blur">
      <span className="ml-1 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-white" />
    </span>
  );
}

function StoryboardArtwork({ demo, compact = false }: { demo: DemoCompositionItem; compact?: boolean }) {
  const isBeauty = demo.id === "demo-beauty-ugc";
  const isGadget = demo.id === "demo-gadget-review";
  const isBeforeAfter = demo.id === "demo-before-after";

  if (demo.thumbnail) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={demo.thumbnail} alt={`${demo.title}の構成イメージ`} className="absolute inset-0 h-full w-full object-cover" />;
  }

  return (
    <div
      aria-label={`${demo.title}のストーリーボード構成イメージ`}
      role="img"
      className={`absolute inset-0 overflow-hidden ${isBeauty ? "bg-[#2a151b]" : isGadget ? "bg-[#101e2a]" : "bg-[#12231d]"}`}
    >
      <div className={`absolute inset-0 opacity-60 ${isBeauty ? "bg-[radial-gradient(ellipse_at_25%_20%,#d58b9b,transparent_35%),radial-gradient(ellipse_at_80%_70%,#7b344b,transparent_40%)]" : isGadget ? "bg-[radial-gradient(ellipse_at_70%_18%,#7ac7d9,transparent_32%),radial-gradient(ellipse_at_20%_80%,#243b65,transparent_45%)]" : "bg-[radial-gradient(ellipse_at_70%_25%,#9ac8a6,transparent_32%),radial-gradient(ellipse_at_18%_85%,#486b53,transparent_45%)]"}`} />
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.2)_1px,transparent_1px)] [background-size:24px_24px]" />
      {isBeauty && (
        <>
          <div className={`absolute left-[17%] top-[21%] w-[52%] rounded-[48%_48%_42%_42%] border border-white/20 bg-gradient-to-br from-[#e8b5b5] via-[#9b626b] to-[#39222c] shadow-2xl ${compact ? "h-[42%]" : "h-[46%]"}`} />
          <div className="absolute left-[27%] top-[31%] h-[5%] w-[31%] rounded-full bg-[#f2d3c9]/75 blur-sm" />
          <div className="absolute bottom-[21%] right-[12%] h-[28%] w-[23%] rotate-[13deg] rounded-[12px] border border-white/30 bg-gradient-to-br from-[#f2d4cb] to-[#a75b70] shadow-2xl">
            <div className="absolute inset-x-[22%] top-[18%] h-px bg-white/60" />
            <div className="absolute inset-x-[22%] top-[28%] h-[32%] border-y border-white/30" />
          </div>
        </>
      )}
      {isGadget && (
        <>
          <div className="absolute left-[19%] top-[19%] h-[57%] w-[35%] rotate-[-8deg] rounded-[20px] border border-white/35 bg-gradient-to-br from-[#7f9da8] via-[#273b4a] to-[#080e16] shadow-2xl">
            <div className="absolute inset-[8%] rounded-[14px] border border-white/15 bg-[radial-gradient(circle_at_50%_35%,#a4e3ee,transparent_25%),linear-gradient(145deg,#1d3547,#070d14)]" />
            <div className="absolute bottom-[10%] left-[28%] h-[3px] w-[44%] rounded-full bg-white/45" />
          </div>
          <div className="absolute right-[12%] top-[34%] h-[35%] w-[24%] rounded-[45%] border border-white/35 bg-gradient-to-br from-[#bed3da] to-[#1a2c3b] shadow-xl">
            <div className="absolute inset-[13%] rounded-[45%] border border-black/30" />
          </div>
        </>
      )}
      {isBeforeAfter && (
        <>
          <div className="absolute inset-y-[18%] left-[10%] w-[37%] overflow-hidden rounded-[14px] border border-white/25 bg-gradient-to-br from-[#5d6a5e] to-[#202e25]">
            <div className="absolute left-[18%] top-[16%] h-[52%] w-[64%] rounded-[50%_50%_38%_38%] bg-gradient-to-br from-[#8d9d8d] to-[#3c4a3d]" />
            <span className="absolute bottom-3 left-3 font-mono text-[9px] tracking-[.2em] text-white/70">BEFORE</span>
          </div>
          <div className="absolute inset-y-[18%] right-[10%] w-[37%] overflow-hidden rounded-[14px] border border-[#d7ff43]/60 bg-gradient-to-br from-[#a5d3ad] to-[#315844]">
            <div className="absolute left-[18%] top-[16%] h-[52%] w-[64%] rounded-[50%_50%_38%_38%] bg-gradient-to-br from-[#e0f2d8] to-[#6b9d7b]" />
            <span className="absolute bottom-3 left-3 font-mono text-[9px] tracking-[.2em] text-white/85">AFTER*</span>
          </div>
          <div className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-black/60 text-sm text-white">↔</div>
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent px-5 pb-5 pt-16">
        <p className="font-mono text-[9px] tracking-[.25em] text-white/55">ZENOVA / STORYBOARD</p>
        <p className="mt-2 max-w-[85%] text-xl font-semibold leading-tight tracking-[-.04em] text-white sm:text-2xl">{demo.title}</p>
      </div>
      <span className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/35 px-2.5 py-1 font-mono text-[9px] tracking-[.15em] text-white/75 backdrop-blur">
        {demo.duration}
      </span>
    </div>
  );
}

function DemoCard({ demo, onOpen, index }: { demo: DemoCompositionItem; onOpen: (d: DemoCompositionItem) => void; index: number }) {
  return (
    <article className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[.025] transition duration-500 hover:-translate-y-1 hover:border-[#d7ff43]/35 hover:bg-white/[.04]">
      <button type="button" onClick={() => onOpen(demo)} aria-label={`${demo.title}の構成プレビューを開く`} className="relative block aspect-[4/5] w-full overflow-hidden text-left">
        <StoryboardArtwork demo={demo} />
        <span className="absolute right-4 top-16 opacity-70 transition group-hover:scale-110 group-hover:opacity-100"><PlayMark /></span>
        <span className="absolute bottom-[6.6rem] left-5 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[9px] font-semibold tracking-[.16em] text-white/70 backdrop-blur">構成プレビュー</span>
      </button>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] tracking-[.22em] text-white/30">FORMAT / 0{index + 1}</p>
            <h3 className="mt-1 text-lg font-semibold tracking-[-.03em] text-white">{demo.title}</h3>
          </div>
          <span className="mt-1 text-[10px] text-white/40">{demo.duration}</span>
        </div>
        <p className="mt-2 min-h-[3rem] text-xs leading-6 text-white/45">{demo.description}</p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => onOpen(demo)} className="flex-1 rounded-xl border border-white/10 py-3 text-xs font-medium text-white/70 transition hover:border-white/25 hover:bg-white/5">構成を見る</button>
          <Link href={buildAnalyzeDemoHref(demo.templateKey)} className="flex-1 rounded-xl bg-white py-3 text-center text-xs font-bold text-black transition hover:bg-[#d7ff43]">この構成で作る ↗</Link>
        </div>
      </div>
    </article>
  );
}

function Modal({ demo, onClose }: { demo: DemoCompositionItem; onClose: () => void }) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && dialog.current) {
        const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => close.current?.focus());
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/85 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby={id} onClick={onClose}>
      <div ref={dialog} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#080808] shadow-2xl shadow-black/60" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-[#d7ff43]">ZENOVA / STORYBOARD</p>
            <h3 id={id} className="mt-1 text-lg font-semibold text-white">{demo.title}</h3>
          </div>
          <button ref={close} type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-lg text-white/60 transition hover:border-white/30 hover:text-white" aria-label="閉じる">×</button>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden sm:aspect-video">
          <StoryboardArtwork demo={demo} compact />
          <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-[10px] text-white/80 backdrop-blur">静止画による構成イメージ</div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">
          {demo.composition.map((beat, index) => (
            <div key={beat.timing} className="group rounded-2xl border border-white/8 bg-white/[.025] p-4 transition hover:border-white/20">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] text-[#d7ff43]">{beat.timing}</span>
                <span className="font-mono text-[9px] text-white/25">SHOT / 0{index + 1}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-white">{beat.title}</p>
              <p className="mt-1 text-xs leading-6 text-white/45">{beat.direction}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 px-5 pb-6 sm:flex-row sm:px-7 sm:pb-7">
          <Link href={buildAnalyzeDemoHref(demo.templateKey)} className="flex flex-1 items-center justify-center rounded-full bg-[#d7ff43] py-3.5 text-sm font-bold text-black transition hover:bg-white">この構成で動画を作る ↗</Link>
          <button type="button" onClick={onClose} className="rounded-full border border-white/15 px-6 py-3.5 text-sm text-white/70 transition hover:bg-white/5">閉じる</button>
        </div>
      </div>
    </div>
  );
}

export function LandingSampleVideos() {
  const [active, setActive] = useState<DemoCompositionItem | null>(null);
  return (
    <section className="border-y border-white/10 bg-white/[.015] px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.3em] text-[#d7ff43]">02 / OUTPUT</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-.04em] text-white sm:text-5xl">{DEMO_SECTION_TITLE}</h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-white/45">{DEMO_SECTION_SUBTITLE}</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">{DEMO_COMPOSITIONS.map((demo, index) => <DemoCard key={demo.id} demo={demo} index={index} onOpen={setActive} />)}</div>
        <p className="mt-5 text-[10px] leading-6 text-white/30">※ 表示は動画の完成品ではなく、構成を確認するためのイメージです。実際の生成結果は入力内容や生成設定によって異なります。</p>
      </div>
      {active && <Modal demo={active} onClose={() => setActive(null)} />}
    </section>
  );
}
