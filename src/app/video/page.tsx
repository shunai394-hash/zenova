import { SiteHeader } from "@/components/site-header";
import { AiVideoWorkspace } from "@/components/video/ai-video-workspace";

export default function VideoPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500">ZENOVA / AI VIDEO STUDIO</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Turn a thought into motion.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">画像でも、言葉でも。Higgsfieldの生成モデルを使って、アイデアをそのまま映像へ。CMだけに縛られない、クリエイティブのためのAI Video Studio。</p>
          </div>
          <div className="flex gap-2 text-[11px] text-zinc-500 lg:pb-1"><span className="rounded-full border border-white/10 px-3 py-1.5">Prompt-first</span><span className="rounded-full border border-white/10 px-3 py-1.5">AI motion</span></div>
        </header>
        <AiVideoWorkspace />
      </div>
    </main>
  );
}
