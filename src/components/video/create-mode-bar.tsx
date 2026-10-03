"use client";

import Link from "next/link";

const MODES = [
  { id: "video", label: "Video", sub: "Text / Image → Video", href: "/video", active: true },
  { id: "story", label: "Story", sub: "Multi-shot", href: "/video?mode=story" },
  { id: "character", label: "Character", sub: "Create a character", href: "/video?mode=character" },
  { id: "avatar", label: "Avatar", sub: "Character → Voice", href: "/video?mode=avatar" },
  { id: "ai-person", label: "AI Person", sub: "Realtime · planned", href: "/video?mode=ai-person" },
] as const;

export function CreateModeBar() {
  return (
    <nav aria-label="Create modes" className="mb-6 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1.5">
      <div className="flex min-w-max gap-1">
        {MODES.map((mode) => (
          <Link
            key={mode.id}
            href={mode.href}
            aria-current={mode.id === "video" ? "page" : undefined}
            className={[
              "min-w-[132px] rounded-xl px-3.5 py-3 text-left transition",
              mode.id === "video"
                ? "bg-white text-black shadow-lg shadow-white/5"
                : "text-zinc-400 hover:bg-white/[0.05] hover:text-white",
            ].join(" ")}
          >
            <span className="block text-sm font-medium">{mode.label}</span>
            <span className="mt-0.5 block text-[10px] text-zinc-600">
              {mode.sub}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
