"use client";

import Link from "next/link";

const MODES = [
  { id: "video", label: "Video", sub: "Text / Image → Video", href: "/video", available: true },
  { id: "story", label: "Story", sub: "Coming soon", available: false },
  { id: "character", label: "Character", sub: "Coming soon", available: false },
  { id: "avatar", label: "Avatar", sub: "Coming soon", available: false },
  { id: "ai-person", label: "AI Person", sub: "Planned · Realtime", available: false },
] as const;

export function CreateModeBar() {
  return (
    <nav aria-label="Create modes" className="mb-6 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1.5">
      <div className="flex min-w-max gap-1">
        {MODES.map((mode) => {
          const className = [
            "min-w-[132px] rounded-xl px-3.5 py-3 text-left",
            mode.available
              ? "bg-white text-black shadow-lg shadow-white/5"
              : "cursor-not-allowed text-zinc-500 opacity-75",
          ].join(" ");

          return mode.available ? (
            <Link key={mode.id} href={mode.href} aria-current="page" className={className}>
              <span className="block text-sm font-medium">{mode.label}</span>
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
