"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BRAND_NAME, CTA_UPLOAD_IMAGE, HERO_COPY_MAIN, HERO_COPY_SUB, HERO_INPUT_SUPPORT, HERO_URL_PLACEHOLDER, HERO_USE_CASES, VIDEO_CREATE_CTA } from "@/lib/landing/copy";
import { isValidHttpUrl, uploadProductImage } from "@/lib/landing/upload";

export function LandingHero() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) return setError("商品URLを入力してください");
    if (!isValidHttpUrl(trimmed)) return setError("有効なURLを入力してください");
    setError(null); setLoading(true);
    router.push(`/analyze?url=${encodeURIComponent(trimmed)}&purpose=sell`);
  };

  const onPickImage = async (file: File | null) => {
    if (!file) return;
    setError(null); setLoading(true);
    try {
      const result = await uploadProductImage(file);
      if (!result.ok) {
        setError(result.notReady ? "画像アップロードの準備中です。現在は商品URLから始められます。" : result.error);
        setLoading(false); return;
      }
      router.push(`/analyze?image=${encodeURIComponent(result.publicUrl)}&purpose=sell`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err)); setLoading(false);
    }
  };

  return (
    <section id="hero" className="relative overflow-hidden border-b border-zinc-900 px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-16rem] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-violet-500/[0.10] blur-[120px]" />
        <div className="absolute right-[-10rem] top-20 h-[28rem] w-[28rem] rounded-full bg-cyan-400/[0.06] blur-[110px]" />
      </div>
      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,.92fr)]">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-zinc-300">{BRAND_NAME}</span>
              <span>AI creative workflow</span>
            </div>
            <h1 className="mt-7 whitespace-pre-line text-5xl font-medium leading-[.94] tracking-[-0.065em] text-white sm:text-6xl lg:text-7xl">{HERO_COPY_MAIN}</h1>
            <p className="mt-6 max-w-2xl whitespace-pre-line text-sm leading-7 text-zinc-300 sm:text-base sm:leading-8">{HERO_COPY_SUB}</p>
            <div className="mt-7 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
              {[["01","目的を決める"],["02","生成する"],["03","見直す"],["04","改善する"]].map(([n,label]) => (
                <div key={n} className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-3">
                  <span className="font-mono text-[9px] tracking-[0.18em] text-cyan-300">{n}</span>
                  <p className="mt-1 text-xs text-zinc-200">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/30 backdrop-blur sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">CREATE STUDIO</p>
            <h2 className="mt-2 text-xl font-medium text-white">アイデアから動画を作る</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">目的選びは後からでもOK。まずは制作画面を開いて、プロンプトや画像から始められます。</p>
            <button type="button" onClick={() => router.push("/video")} className="mt-5 min-h-12 w-full rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-zinc-200">Create Studioを開く →</button>
            <div className="my-4 flex items-center gap-3 text-[10px] text-zinc-600"><div className="h-px flex-1 bg-zinc-800" /><span>または商品URLから始める</span><div className="h-px flex-1 bg-zinc-800" /></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="url" value={url} onChange={(e) => { setUrl(e.target.value); if (error) setError(null); }} onKeyDown={(e) => { if (e.key === "Enter") submitUrl(); }} placeholder={HERO_URL_PLACEHOLDER} disabled={loading} className="min-h-12 w-full rounded-xl bg-black px-4 py-3.5 text-sm text-white outline-none ring-1 ring-zinc-700 placeholder:text-zinc-600 focus:ring-zinc-400 disabled:opacity-50" aria-label="商品URL" />
              <button type="button" onClick={submitUrl} disabled={loading} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 sm:shrink-0">{loading ? "準備中..." : VIDEO_CREATE_CTA}</button>
            </div>
            <div className="my-4 flex items-center gap-3 text-[10px] text-zinc-600"><div className="h-px flex-1 bg-zinc-800" /><span>または</span><div className="h-px flex-1 bg-zinc-800" /></div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { void onPickImage(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            <button type="button" disabled={loading} onClick={() => fileRef.current?.click()} className="min-h-12 w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-50">{CTA_UPLOAD_IMAGE}</button>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.07] pt-4 text-[10px] text-zinc-500">{HERO_INPUT_SUPPORT.map((item) => <span key={item}>✓ {item}</span>)}</div>
            <p className="mt-3 text-[10px] leading-5 text-zinc-600">{HERO_USE_CASES}</p>
            {error && <p className="mt-3 text-sm text-red-300" role="alert">{error}</p>}
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-zinc-500">
          <span className="text-zinc-300">作って終わりではない</span><span>アイデア</span><span>→</span><span>生成</span><span>→</span><span>レビュー</span><span>→</span><span>改善</span>
        </div>
      </div>
    </section>
  );
}
