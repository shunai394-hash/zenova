"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { GeneratedVideoHistoryItem } from "@/lib/sales-data/video-history-types";

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

function formatCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function DashboardVideosPage() {
  const [videos, setVideos] = useState<GeneratedVideoHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/videos");
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
      if (!item.image_url) {
        throw new Error(
          "商品画像が見つかりません。商品詳細から画像をアップロードして再生成してください。"
        );
      }

      const imageRes = await fetch(item.image_url);
      if (!imageRes.ok) {
        throw new Error(
          `商品画像の取得に失敗しました (HTTP ${imageRes.status})`
        );
      }
      const imageBase64 = await blobToBase64(await imageRes.blob());

      const res = await fetch("/api/create-sales-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: item.product_name,
          description: item.description,
          target: item.target,
          platform: item.platform || "TikTok",
          image: imageBase64,
          duration_sec: 5,
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

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
              Sales Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              生成動画履歴
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              generated_videos から取得した販売動画一覧
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/"
              className="rounded border border-zinc-700 px-3 py-2 text-gray-300 hover:bg-zinc-900"
            >
              ← ダッシュボード
            </Link>
            <button
              type="button"
              onClick={() => void loadVideos()}
              disabled={loading || regeneratingId != null}
              className="rounded bg-zinc-900 px-3 py-2 text-gray-300 disabled:opacity-40"
            >
              更新
            </button>
          </div>
        </header>

        {warning && (
          <p className="mt-6 text-sm text-amber-300/90">
            一部データを取得できませんでした（空表示で継続）: {warning}
          </p>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-300">{error}</p>
        )}

        {loading && (
          <p className="mt-10 text-sm text-gray-500">読み込み中...</p>
        )}

        {!loading && videos.length === 0 && (
          <p className="mt-10 text-sm text-gray-500">
            まだ生成動画がありません。ダッシュボードから販売動画を作成するとここに表示されます。
          </p>
        )}

        {!loading && videos.length > 0 && (
          <ul className="mt-8 space-y-6">
            {videos.map((item) => {
              const isPlaying = playingId === item.id;
              const isBusy = regeneratingId === item.id;
              return (
                <li
                  key={item.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {item.product_name}
                      </h2>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatCreatedAt(item.created_at)}
                      </p>
                    </div>
                    <div className="rounded bg-zinc-900 px-2 py-1 text-xs text-gray-300">
                      評価スコア{" "}
                      <span className="font-semibold text-white">
                        {item.score ?? "—"}
                      </span>
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-gray-500">Hook</dt>
                      <dd className="mt-1 text-gray-300">
                        {item.hook || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Selling angle</dt>
                      <dd className="mt-1 text-gray-300">
                        {item.selling_angle || "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-gray-500">動画URL</dt>
                      <dd className="mt-1 break-all text-xs text-gray-500">
                        {item.video_url || "—"}
                      </dd>
                    </div>
                  </dl>

                  {isPlaying && item.video_url && (
                    <video
                      key={item.video_url}
                      src={item.video_url}
                      controls
                      autoPlay
                      playsInline
                      className="mt-4 w-full max-w-md rounded border border-zinc-800 bg-black"
                    />
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!item.video_url}
                      onClick={() =>
                        setPlayingId((prev) =>
                          prev === item.id ? null : item.id
                        )
                      }
                      className="rounded bg-white px-3 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isPlaying ? "再生を閉じる" : "動画再生"}
                    </button>
                    <Link
                      href={`/?product=${encodeURIComponent(item.product_id)}`}
                      className="rounded border border-zinc-700 px-3 py-2 text-sm text-gray-200 hover:bg-zinc-900"
                    >
                      商品詳細へ移動
                    </Link>
                    <button
                      type="button"
                      disabled={regeneratingId != null}
                      onClick={() => void regenerate(item)}
                      className="rounded border border-zinc-700 px-3 py-2 text-sm text-gray-200 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isBusy ? "再生成中..." : "再生成"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
