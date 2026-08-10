"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import type { GeneratedVideoHistoryItem } from "@/lib/sales-data/video-history-types";
import { HistoryVideoCard } from "@/components/history/history-video-card";

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function downloadVideo(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ダウンロード失敗 (HTTP ${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function HistoryContent() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus")?.trim() || null;
  const action = searchParams.get("action")?.trim() || null;

  const [videos, setVideos] = useState<GeneratedVideoHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      const list = Array.isArray(data?.videos)
        ? (data.videos as GeneratedVideoHistoryItem[])
        : [];
      setVideos(list);
      if (Array.isArray(data?.warnings) && data.warnings.length > 0) {
        setWarning(data.warnings.join(" / "));
      } else {
        setWarning(null);
      }
    } catch (err) {
      setVideos([]);
      setWarning(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  const regenerate = async (item: GeneratedVideoHistoryItem) => {
    if (regeneratingId) return;
    setError(null);
    setRegeneratingId(item.id);

    try {
      const imageSrc = item.image_url || item.thumbnail_url;
      if (!imageSrc) {
        throw new Error(
          "商品画像が見つかりません。Analyzeから画像付きで再生成してください。"
        );
      }

      const imageRes = await fetch(imageSrc);
      if (!imageRes.ok) {
        throw new Error(`商品画像の取得に失敗しました (HTTP ${imageRes.status})`);
      }
      const imageBase64 = await blobToBase64(await imageRes.blob());

      const res = await fetch("/api/create-sales-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: item.product_name,
          description: item.description || item.product_name,
          target: item.target || "20〜30代の視聴者",
          platform: item.platform || "TikTok",
          image: imageBase64,
          duration_sec: 5,
          product_id: item.product_id || undefined,
          source_url: item.source_url || undefined,
          thumbnail_url: item.thumbnail_url || item.image_url || undefined,
          style: item.style || undefined,
          motion: item.style || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "再生成に失敗しました"
        );
      }

      await loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRegeneratingId(null);
    }
  };

  const remove = async (item: GeneratedVideoHistoryItem) => {
    if (deletingId) return;
    if (!window.confirm(`「${item.product_name}」の動画を削除しますか？`)) {
      return;
    }
    setError(null);
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/history/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "削除に失敗しました"
        );
      }
      setVideos((prev) => prev.filter((v) => v.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  };

  const download = async (item: GeneratedVideoHistoryItem) => {
    if (!item.video_url || downloadingId) return;
    setError(null);
    setDownloadingId(item.id);
    try {
      const safeName = item.product_name.replace(
        /[^\w\u3040-\u30ff\u4e00-\u9fff-]+/g,
        "_"
      );
      await downloadVideo(item.video_url, `zenova-${safeName || "video"}.mp4`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
          ZENOVA History
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          生成動画履歴
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          投稿結果を入れて振り返り → 次の動画案まで、改善ループを回せます
        </p>
      </header>

      {warning && (
        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          {warning}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">読み込み中...</p>
      ) : videos.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-sm text-gray-400">まだ生成動画がありません</p>
          <Link
            href="/analyze"
            className="mt-4 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black"
          >
            動画を作る
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {videos.map((item) => (
            <HistoryVideoCard
              key={item.id}
              item={item}
              initialExpandForm={
                focusId === item.id && action === "post-result"
              }
              regenerating={regeneratingId === item.id}
              downloading={downloadingId === item.id}
              deleting={deletingId === item.id}
              onRegenerate={() => void regenerate(item)}
              onDownload={() => void download(item)}
              onDelete={() => void remove(item)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

export default function HistoryPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Suspense
          fallback={<p className="text-sm text-gray-500">読み込み中...</p>}
        >
          <HistoryContent />
        </Suspense>
      </div>
    </main>
  );
}
