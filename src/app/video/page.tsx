import { SiteHeader } from "@/components/site-header";
import { AiVideoWorkspace } from "@/components/video/ai-video-workspace";

export default function VideoPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white selection:bg-white selection:text-black">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_8%,rgba(255,255,255,0.07),transparent_28%),radial-gradient(circle_at_12%_32%,rgba(99,102,241,0.08),transparent_24%)]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <div className="relative z-10">
        <SiteHeader />

        <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <header className="relative border-b border-white/10 pb-10 lg:pb-14">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-5xl">
                <div className="mb-6 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
                  <span className="h-px w-8 bg-zinc-600" />
                  ZENOVA / VIDEO STUDIO
                  <span className="text-zinc-700">01</span>
                </div>
                <h1 className="text-[clamp(3.4rem,8vw,8.5rem)] font-medium leading-[0.82] tracking-[-0.075em]">
                  Create anything.
                  <br />
                  <span className="text-zinc-500">Make it move.</span>
                </h1>
                <p className="mt-8 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base sm:leading-8">
                  画像、動画、音声、そしてあなたの言葉から、ひとつの映像をつくる。
                  <br className="hidden sm:block" />
                  プロダクト、物語、キャラクター、ショートフィルムまで。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 lg:w-[320px] lg:shrink-0">
                <div className="bg-[#090909] p-4">
                  <p className="text-[9px] uppercase tracking-[0.22em] text-zinc-600">Direction</p>
                  <p className="mt-2 text-sm text-zinc-300">AI Director</p>
                </div>
                <div className="bg-[#090909] p-4">
                  <p className="text-[9px] uppercase tracking-[0.22em] text-zinc-600">Loop</p>
                  <p className="mt-2 text-sm text-zinc-300">Refine → Repeat</p>
                </div>
                <div className="col-span-2 bg-[#090909] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] uppercase tracking-[0.22em] text-zinc-600">Creative standard</p>
                    <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-zinc-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      Idea → Film
                    </span>
                  </div>
                  <div className="mt-3 h-px bg-gradient-to-r from-white/50 via-white/15 to-transparent" />
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
            <div>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">Creative console</p>
                  <p className="mt-1 text-xs text-zinc-500">Assets → Direction → Render</p>
                </div>
                <span className="hidden text-[9px] uppercase tracking-[0.2em] text-zinc-700 sm:block">
                  16:9 · 9:16 · 1:1
                </span>
              </div>
              <AiVideoWorkspace />
            </div>

            <aside className="lg:pt-9">
              <div className="sticky top-24 space-y-4">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080808]">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.24em] text-zinc-600">Director's note</p>
                      <p className="mt-1 text-xs text-zinc-300">Start with an idea. Shape the scene.</p>
                    </div>
                    <span className="text-[9px] text-zinc-700">ZENOVA</span>
                  </div>
                  <div className="space-y-4 p-4 text-xs leading-6 text-zinc-500">
                    <p><span className="text-zinc-300">01</span> Start with intent — not a preset.</p>
                    <p><span className="text-zinc-300">02</span> Shape camera, light, pacing and atmosphere.</p>
                    <p><span className="text-zinc-300">03</span> Watch the result, then direct the next take.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.24em] text-zinc-600">Quality check</p>
                      <p className="mt-2 text-lg font-medium tracking-tight">Clarity over clutter.</p>
                    </div>
                    <span className="text-[10px] text-zinc-600">∞</span>
                  </div>
                  <div className="mt-5 space-y-2 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                    <div className="flex justify-between border-t border-white/5 pt-2"><span>Intent</span><span>01</span></div>
                    <div className="flex justify-between border-t border-white/5 pt-2"><span>Motion</span><span>02</span></div>
                    <div className="flex justify-between border-t border-white/5 pt-2"><span>Sound</span><span>03</span></div>
                    <div className="flex justify-between border-t border-white/5 pt-2"><span>Next take</span><span>04</span></div>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <footer className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-5 text-[9px] uppercase tracking-[0.22em] text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
            <span>ZENOVA — AI video production OS</span>
            <span>Your idea. Your direction. Your film.</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
