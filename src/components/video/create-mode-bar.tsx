"use client";

import Link from "next/link";

const MODES = [
  { id: "video", label: "Video", sub: "Text / Image → Video", href: "/video", available: true },
  { id: "story", label: "Story", sub: "Coming soon", available: false },
  { id: "character", label: "Character", sub: "Identity & look", available: false },
  { id: "motion", label: "Motion", sub: "Reference → Character", available: false },
  { id: "avatar", label: "Avatar", sub: "Voice & presence", available: false },
  { id: "ai-person", label: "AI Person", sub: "Planned · Realtime", available: false },
] as const;

export function CreateModeBar() {
  return (
    <nav aria-label="Create modes" className="mb-7 overflow-x-auto border-y border-white/[0.07] py-1">
      <div className="flex min-w-max items-stretch gap-0">
        {MODES.map((mode) => {
          const className = [
            "relative min-w-[132px] border-r border-white/[0.07] px-4 py-3 text-left transition duration-300 first:border-l hover:bg-white/[0.025]",
            mode.available
              ? "text-white after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-cyan-200/80 after:shadow-[0_0_14px_rgba(103,232,249,0.35)]"
              : "cursor-not-allowed text-zinc-600 opacity-75",
          ].join(" ");

          return mode.available ? (
            <Link key={mode.id} href={mode.href} aria-current="page" className={className}>
              <span className="mb-1 block text-[9px] uppercase tracking-[0.2em] text-zinc-600">{String(MODES.indexOf(mode) + 1).padStart(2, "0")}</span><span className="mb-1 block text-[9px] uppercase tracking-[0.2em] text-zinc-600">{String(MODES.indexOf(mode) + 1).padStart(2, "0")}</span><span className="block text-sm font-medium">{mode.label}</span>
              <span className="mt-0.5 block text-[10px] text-zinc-600">{mode.sub}</span>
            </Link>
          ) : (
            <div key={mode.id} aria-disabled="true" className={className} title="このモードは準備中です">
              <span className="block text-sm font-medium">{mode.label}</span>
              <span className="mt-0.5 block text-[10px] text-zinc-500">{mode.sub}</span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
