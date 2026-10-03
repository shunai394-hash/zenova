import { SiteHeader } from "@/components/site-header";
import { AiVideoWorkspace } from "@/components/video/ai-video-workspace";

export default function VideoPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070709] text-white selection:bg-violet-300 selection:text-black">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[720px] overflow-hidden">
        <div className="absolute -top-56 left-[12%] h-[560px] w-[560px] rounded-full bg-violet-600/[0.12] blur-[130px]" />
        <div className="absolute -top-48 right-[5%] h-[460px] w-[460px] rounded-full bg-cyan-400/[0.08] blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,#070709_94%)]" />
      </div>
      <div className="relative z-10">
        <SiteHeader />
        <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
          <header className="relative mb-8 overflow-hidden rounded-[2rem] border border-white/[0.09] bg-white/[0.025] px-5 py-8 sm:px-8 sm:py-10 lg:px-11 lg:py-12">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(139,92,246,0.10),transparent_42%,rgba(34,211,238,0.06))]" />
              <div className="absolute right-[-7rem] top-[-11rem] h-[26rem] w-[26rem] rounded-full border border-white/[0.08] sm:right-[-4rem]">
                <div className="absolute inset-8 rounded-full border border-white/[0.07]" />
                <div className="absolute inset-16 rounded-full border border-white/[0.06]" />
                <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet-400/25 via-fuchsia-400/10 to-cyan-300/20 blur-2xl" />
              </div>
            </div>
            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]" />
                    ZENOVA / AI VIDEO STUDIO
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Imagine · Direct · Create</span>
                </div>
                <h1 className="mt-6 max-w-3xl text-[2.7rem] font-medium leading-[0.98] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
                  Turn a thought
                  <br />
                  <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">into motion.</span>
                </h1>
                <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base sm:leading-8">
                  画像でも、言葉でも。アイデアを映像へ。
                  <br className="hidden sm:block" />
                  Higgsfieldの生成モデルで、まだ存在しないシーンを形にする。
                </p>
              </div>
              <div className="relative hidden min-h-36 flex-col justify-end border-l border-white/10 pl-5 lg:flex">
                <span className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Your next scene</span>
                <span className="mt-2 text-2xl font-light tracking-tight text-zinc-200">Starts here<span className="text-cyan-200">.</span></span>
                <div className="mt-5 flex gap-1.5" aria-hidden="true">
                  {Array.from({ length: 18 }, (_, i) => (
                    <span key={i} className="h-7 w-1 rounded-full bg-gradient-to-t from-violet-400/20 via-zinc-400/50 to-cyan-200/70" style={{ opacity: 0.25 + ((i * 7) % 10) / 13, transform: `scaleY(${0.35 + ((i * 11) % 9) / 10})` }} />
                  ))}
                </div>
              </div>
            </div>
            <div aria-hidden="true" className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent sm:left-11 sm:right-11" />
          </header>
          <div className="mb-5 flex items-center justify-between gap-4 px-1">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-600">Creative workspace</p>
              <p className="mt-1 text-sm text-zinc-400">Build your next visual, one decision at a time.</p>
            </div>
            <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-zinc-600 sm:flex">
              <span className="rounded-full border border-white/10 px-3 py-1.5">Prompt-first</span>
              <span className="rounded-full border border-white/10 px-3 py-1.5">AI motion</span>
            </div>
          </div>
          <AiVideoWorkspace />
          <footer className="mt-10 flex flex-col gap-2 border-t border-white/[0.07] px-1 py-5 text-[10px] uppercase tracking-[0.16em] text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
            <span>ZENOVA · Creative tools for ideas in motion</span>
            <span>Designed for the frame you imagine.</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
