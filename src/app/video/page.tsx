import { SiteHeader } from "@/components/site-header";
import { VideoWorkspace } from "@/components/video/video-workspace";

export default function VideoPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
            ZENOVA Workspace
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Video
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            台本 → Qwen 音声 → 素材 → 字幕 → 9:16 MP4
          </p>
        </header>
        <VideoWorkspace />
      </div>
    </main>
  );
}
