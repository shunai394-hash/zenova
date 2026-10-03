import { SiteHeader } from "@/components/site-header";
import { AiVideoWorkspace } from "@/components/video/ai-video-workspace";

export default function VideoPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">ZENOVA AI VIDEO</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">AI Video</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            画像と自然な指示だけで、Higgsfieldが映像を生成します。CM、SNS、商品紹介、作品制作など用途は限定しません。
          </p>
        </header>
        <AiVideoWorkspace />
      </div>
    </main>
  );
}
