"use client";

import { useEffect, useRef, useState } from "react";

export function HeroSignal() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      setTilt({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative hidden min-h-52 overflow-hidden border-l border-white/10 pl-6 lg:flex lg:flex-col lg:justify-between"
      style={{ perspective: "900px" }}
      aria-label="ZENOVA live creative signal"
    >
      <div
        className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-cyan-200/[0.08] transition-transform duration-700 ease-out"
        style={{ transform: `translate3d(${tilt.x * -10}px, ${tilt.y * -8}px, 0) rotate(${tilt.x * 3}deg)` }}
        aria-hidden="true"
      >
        <div className="absolute inset-8 rounded-full border border-violet-300/[0.07]" />
        <div className="absolute inset-16 rounded-full border border-white/[0.06]" />
        <div className="absolute inset-24 rounded-full bg-cyan-200/[0.08] blur-2xl" />
      </div>
      <div className="relative flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-zinc-500">
        <span>Signal / Motion</span><span className="text-cyan-200">LIVE</span>
      </div>
      <div
        className="relative mt-2 transition-transform duration-500 ease-out"
        style={{ transform: `translate3d(${tilt.x * 5}px, ${tilt.y * 4}px, 0)` }}
      >
        <span className="block text-3xl font-light tracking-[-0.04em] text-zinc-200">Start with a frame<span className="text-cyan-200">.</span></span>
        <span className="mt-2 block text-[9px] uppercase tracking-[0.2em] text-zinc-600">Direction becomes motion</span>
      </div>
      <div className="relative mt-5 flex h-8 items-end gap-1.5" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <span
            key={i}
            className="h-7 w-1 origin-bottom rounded-full bg-gradient-to-t from-violet-400/20 via-zinc-400/50 to-cyan-200/70"
            style={{
              opacity: 0.25 + ((i * 7) % 10) / 13,
              transform: `scaleY(${0.35 + ((i * 11) % 9) / 10}) translateY(${tilt.y * -2}px)`,
              transition: "transform 500ms ease-out",
            }}
          />
        ))}
      </div>
    </div>
  );
}
