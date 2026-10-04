import { SiteHeader } from "@/components/site-header";
import { AiVideoWorkspace } from "@/components/video/ai-video-workspace";
import { CreateModeBar } from "@/components/video/create-mode-bar";
import { ScrollDirector } from "@/components/video/scroll-director";

export default function VideoPage() {
  return (
    <a href="#zenova-content" className="sr-only z-[100] rounded-full bg-white px-4 py-2 text-sm font-medium text-black focus:not-sr-only focus:absolute focus:left-4 focus:top-4">コンテンツへ移動</a>
    <main id="zenova-content" tabIndex={-1} className="relative min-h-screen overflow-hidden bg-[#070709] text-white selection:bg-violet-300 selection:text-black">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[820px] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
        <div className="absolute -top-56 left-[12%] h-[620px] w-[620px] rounded-full bg-violet-600/[0.14] blur-[150px] animate-pulse [animation-duration:8s]" />
        <div className="absolute -top-48 right-[5%] h-[520px] w-[520px] rounded-full bg-cyan-400/[0.10] blur-[135px] animate-pulse [animation-duration:11s]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,#070709_94%)]" />
      </div>
      <div className="relative z-10">
        <SiteHeader />
        <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
          <header className="relative mb-8 overflow-hidden rounded-[2.25rem] border border-white/[0.11] bg-black/35 px-5 py-9 shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:px-8 sm:py-11 lg:px-12 lg:py-14">
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
                <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.34em] text-zinc-500">Creative direction / 01</p>                <h1 className="mt-2 max-w-4xl text-[3rem] font-medium leading-[0.9] tracking-[-0.075em] sm:text-6xl lg:text-[5.6rem]">
                  頭の中のアイデアを、
                  <br />
                  <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">「伝わる映像」に<span className="text-cyan-200">.</span></span>
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base sm:leading-8">
                  「動画を作りたい。でも、何から始めればいいかわからない。」
                  <br className="hidden sm:block" />
                  ZENOVAは、商品・SNS・広告・ブランドの“見せたい”を、入力から完成まで迷わせずに進めます。
                </p>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
                  <span><span className="text-zinc-200">01</span> 伝える</span>
                  <span><span className="text-zinc-200">02</span> 生成する</span>
                  <span><span className="text-zinc-200">03</span> 見直す</span>
                  <span><span className="text-zinc-200">04</span> 改善する</span>
                </div>
                <div className="mt-7 flex flex-wrap gap-2 text-[11px] text-zinc-300">
                  {["最短3ステップ", "画像なしでもOK", "9:16 / 16:9 / 1:1", "生成後も再確認"].map((item) => (
                    <span key={item} className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5">{item}</span>
                  ))}
                </div>
              </div>
              <div className="relative hidden min-h-52 flex-col justify-between border-l border-white/10 pl-6 lg:flex">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-zinc-500"><span>Signal / Motion</span><span className="text-cyan-200">LIVE</span></div>
                <span className="mt-2 text-3xl font-light tracking-[-0.04em] text-zinc-200">Start with a frame<span className="text-cyan-200">.</span></span>
                <div className="mt-5 flex h-8 items-end gap-1.5" aria-hidden="true">
                  {Array.from({ length: 18 }, (_, i) => (
                    <span key={i} className="h-7 w-1 origin-bottom rounded-full bg-gradient-to-t from-violet-400/20 via-zinc-400/50 to-cyan-200/70" style={{ opacity: 0.25 + ((i * 7) % 10) / 13, transform: `scaleY(${0.35 + ((i * 11) % 9) / 10})` }} />
                  ))}
                </div>
              </div>
            </div>
            <div aria-hidden="true" className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent sm:left-11 sm:right-11" />
          </header>
          <section aria-label="ZENOVA creative sequence" className="relative mb-10 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#09090b] px-5 py-6 sm:px-7 sm:py-7">
            <div aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-200/45 to-transparent" />
            <div aria-hidden="true" className="absolute -left-20 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-cyan-300/[0.06] blur-3xl" />
            <div className="relative grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)_220px] lg:items-center">
              <div className="flex items-center gap-3 lg:block">
                <span className="text-[9px] uppercase tracking-[0.28em] text-cyan-200/70">The ZENOVA method</span>
                <span className="hidden text-[10px] uppercase tracking-[0.18em] text-zinc-700 lg:block lg:pt-2">01 — 05</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  ["01", "FRAME"], ["02", "DIRECT"], ["03", "CONTROL"], ["04", "RENDER"], ["05", "REVIEW"],
                ].map(([n, label], i) => (
                  <div key={n} className="group">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[9px] tabular-nums text-zinc-600">{n}</span>
                      <span className="h-px flex-1 bg-white/[0.08] group-last:bg-transparent" />
                    </div>
                    <span className="text-[9px] uppercase tracking-[0.13em] text-zinc-400 transition group-hover:text-cyan-200">{label}</span>
                  </div>
                ))}
              </div>
              <div className="border-l border-white/[0.08] pl-4 text-[11px] leading-5 text-zinc-500 lg:text-right">
                <span className="text-zinc-300">One direction.</span><br />
                Five deliberate stages.
              </div>
            </div>
          </section>
          <ScrollDirector />
          <CreateModeBar />
          <div className="mb-5 grid gap-4 px-1 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-600">Creative workspace</p>
              <p className="mt-1 text-sm text-zinc-400">アイデア → 生成 → 確認。迷わず1本を完成させます。</p>
            </div>
            <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-zinc-600 sm:flex">
              <span className="rounded-full border border-white/10 px-3 py-1.5">Prompt-first</span>
              <span className="rounded-full border border-white/10 px-3 py-1.5">AI motion</span>
            </div>
          </div>
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            {[
              ["01", "Describe", "何を見せたいか、普通の文章で。"],
              ["02", "Generate", "AIが動き・カメラ・演出を組み立てます。"],
              ["03", "Review", "完成映像を見て、次の1本へ改善。"],
            ].map(([n, title, body]) => (
              <div key={n} className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.035]">
                <div className="flex items-center gap-2"><span className="text-[10px] tracking-[0.2em] text-cyan-300">{n}</span><span className="text-xs font-medium text-zinc-200">{title}</span></div>
                <p className="mt-1 text-[11px] leading-5 text-zinc-500">{body}</p>
              </div>
            ))}
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
