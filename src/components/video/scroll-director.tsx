"use client";

import { useEffect, useState } from "react";

const STAGES = [
  { id: "source", index: "01", label: "SOURCE", jp: "素材", color: "rgba(103,232,249,0.9)" },
  { id: "direct", index: "02", label: "DIRECT", jp: "演出", color: "rgba(167,139,250,0.9)" },
  { id: "control", index: "03", label: "CONTROL", jp: "制御", color: "rgba(244,244,245,0.8)" },
  { id: "render", index: "04", label: "RENDER", jp: "生成", color: "rgba(103,232,249,0.9)" },
  { id: "review", index: "05", label: "REVIEW", jp: "評価", color: "rgba(167,139,250,0.9)" },
] as const;

export function ScrollDirector() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(motionQuery.matches);
    const onMotionChange = () => setReducedMotion(motionQuery.matches);
    motionQuery.addEventListener?.("change", onMotionChange);

    const targets = STAGES.map((stage) => document.getElementById(`zenova-stage-${stage.id}`)).filter(Boolean) as HTMLElement[];
    if (!targets.length) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const update = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const focus = viewport * 0.38;
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      targets.forEach((target, index) => {
        const rect = target.getBoundingClientRect();
        const distance = Math.abs(rect.top - focus);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
        if (!reducedMotion) {
          const normalized = Math.max(-1, Math.min(1, (rect.top - focus) / Math.max(viewport * 0.8, 1)));
          const depth = Math.min(10, Math.abs(normalized) * 10);
          target.style.setProperty("--zenova-scroll-shift", `${normalized * -1.5}px`);
          target.style.setProperty("--zenova-scroll-scale", `${1 - depth * 0.0015}`);
          target.style.setProperty("--zenova-scroll-opacity", `${1 - depth * 0.012}`);
          target.style.transform = `translate3d(0, var(--zenova-scroll-shift), 0) scale(var(--zenova-scroll-scale))`;
          target.style.opacity = "var(--zenova-scroll-opacity)";
          target.style.willChange = "transform, opacity";
        }
      });

      const scrollable = Math.max(1, document.documentElement.scrollHeight - viewport);
      const nextProgress = Math.min(1, Math.max(0, window.scrollY / scrollable));
      setActive(best);
      setProgress(nextProgress);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      targets.forEach((target) => {
        target.style.removeProperty("--zenova-scroll-shift");
        target.style.removeProperty("--zenova-scroll-scale");
        target.style.removeProperty("--zenova-scroll-opacity");
        target.style.removeProperty("transform");
        target.style.removeProperty("opacity");
        target.style.removeProperty("will-change");
      });
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      motionQuery.removeEventListener?.("change", onMotionChange);
    };
  }, []);

  const stage = STAGES[active];

  return (
    <div className="pointer-events-none sticky top-[4.75rem] z-20 mb-[-2.25rem] flex h-12 items-center justify-center" aria-hidden="true">
      <div className="relative flex w-full max-w-6xl items-center px-4 sm:px-6">
        <div className="absolute left-1/2 top-1/2 h-px w-[calc(100%-3rem)] -translate-x-1/2 -translate-y-1/2 bg-white/[0.07]" />
        <div
          className="absolute left-1/2 top-1/2 h-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-200/70 via-violet-300/70 to-cyan-200/70 shadow-[0_0_16px_rgba(103,232,249,0.22)] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: reducedMotion ? "0%" : `calc((100% - 3rem) * ${progress})` }}
        />
        <div className="relative mx-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/[0.09] bg-[#08080a]/90 px-1.5 py-1.5 shadow-[0_12px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          {STAGES.map((item, index) => {
            const selected = index === active;
            return (
              <span key={item.id} className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[8px] uppercase tracking-[0.16em] transition-all duration-500 motion-reduce:transition-none ${selected ? "bg-white/[0.08] text-white" : "text-zinc-600"}`}>
                <span
                  className="h-1.5 w-1.5 rounded-full transition-all duration-500"
                  style={{ background: selected ? item.color : "rgba(255,255,255,0.12)", boxShadow: selected ? `0 0 12px ${item.color}` : "none" }}
                />
                {item.index}
                <span className="hidden sm:inline">{item.label}</span>
              </span>
            );
          })}
        </div>
      </div>
      <span className="sr-only">{stage.label} / {stage.jp}</span>
    </div>
  );
}
