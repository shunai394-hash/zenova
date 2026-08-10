"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  BRAND_NAME,
  CTA_UPLOAD_IMAGE,
  HERO_COPY_MAIN,
  HERO_COPY_SUB,
  HERO_INPUT_SUPPORT,
  HERO_URL_PLACEHOLDER,
  HERO_USE_CASES,
  VIDEO_CREATE_CTA,
} from "@/lib/landing/copy";
import { isValidHttpUrl, uploadProductImage } from "@/lib/landing/upload";

export function LandingHero() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("URLを入力してください");
      return;
    }
    if (!isValidHttpUrl(trimmed)) {
      setError("有効なURLを入力してください");
      return;
    }
    setError(null);
    setLoading(true);
    router.push(`/analyze?url=${encodeURIComponent(trimmed)}`);
  };

  const onPickImage = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const result = await uploadProductImage(file);
      if (!result.ok) {
        if (result.notReady) {
          // product-images バケット未整備時の代替
          window.alert("画像アップロード機能は近日公開");
          setLoading(false);
          return;
        }
        setError(result.error);
        setLoading(false);
        return;
      }
      router.push(`/analyze?image=${encodeURIComponent(result.publicUrl)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <section
      id="hero"
      className="scroll-mt-20 border-b border-zinc-900 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold tracking-[0.28em] text-gray-500">
          {BRAND_NAME}
        </p>
        <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
          {HERO_COPY_MAIN}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-gray-400 sm:text-base">
          {HERO_COPY_SUB}
        </p>

        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitUrl();
              }}
              placeholder={HERO_URL_PLACEHOLDER}
              disabled={loading}
              className="w-full flex-1 rounded-xl bg-black px-4 py-3.5 text-base text-white outline-none ring-1 ring-zinc-700 placeholder:text-gray-500 focus:ring-zinc-400 disabled:opacity-50"
              aria-label="商品URL"
            />
            <button
              type="button"
              onClick={submitUrl}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:shrink-0"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  準備中...
                </>
              ) : (
                VIDEO_CREATE_CTA
              )}
            </button>
          </div>

          <div className="mt-4 text-left">
            <p className="text-xs font-medium text-gray-400">対応：</p>
            <ul className="mt-1.5 space-y-0.5 text-xs text-gray-500">
              {HERO_INPUT_SUPPORT.map((item) => (
                <li key={item}>・{item}</li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-gray-600">
              {HERO_USE_CASES}
            </p>
          </div>

          {error && (
            <p className="mt-3 text-left text-sm text-red-300" role="alert">
              {error}
            </p>
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-gray-500">
            <div className="h-px flex-1 bg-zinc-800" />
            <span>または</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => {
              void onPickImage(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-gray-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            {CTA_UPLOAD_IMAGE}
          </button>
          <p className="mt-2 text-left text-xs text-gray-600">
            jpg / png / webp ・ 5MBまで
          </p>
        </div>
      </div>
    </section>
  );
}
