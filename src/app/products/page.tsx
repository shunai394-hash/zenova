"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import type {
  DiscoveryPayload,
  DiscoveryProduct,
} from "@/lib/product-discovery";

const EMPTY: DiscoveryPayload = {
  featured: [],
  high_reward: [],
  seasonal: [],
  season: "summer",
  season_label: "夏のトレンド",
  supabase_ok: true,
  warnings: [],
};

function seasonEmoji(seasonLabel: string): string {
  if (seasonLabel.includes("春")) return "🌸";
  if (seasonLabel.includes("夏")) return "☀️";
  if (seasonLabel.includes("秋")) return "🍂";
  if (seasonLabel.includes("冬")) return "❄️";
  return "☀️";
}

function ProductRail({
  id,
  title,
  subtitle,
  products,
  emptyText,
}: {
  id: string;
  title: string;
  subtitle?: string;
  products: DiscoveryProduct[];
  emptyText: string;
}) {
  return (
    <section id={id} className="mt-14 scroll-mt-24">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
        )}
      </div>

      <div className="mt-5 border-t border-zinc-800" />

      {products.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">{emptyText}</p>
      ) : (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [data, setData] = useState<DiscoveryPayload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/discovery/products");
        const json = (await res.json()) as DiscoveryPayload;
        if (cancelled) return;
        setData({
          featured: Array.isArray(json.featured) ? json.featured : [],
          high_reward: Array.isArray(json.high_reward) ? json.high_reward : [],
          seasonal: Array.isArray(json.seasonal) ? json.seasonal : [],
          season: json.season ?? "summer",
          season_label: json.season_label ?? "季節のトレンド",
          supabase_ok: Boolean(json.supabase_ok),
          warnings: Array.isArray(json.warnings) ? json.warnings : [],
        });
        if (Array.isArray(json.warnings) && json.warnings.length > 0) {
          setWarning(json.warnings.join(" / "));
        } else {
          setWarning(null);
        }
      } catch (err) {
        if (cancelled) return;
        setData(EMPTY);
        setWarning(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const seasonalTitle = `${seasonEmoji(data.season_label)} ${data.season_label}`;

  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="border-b border-zinc-900 pb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
            商品を探す
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            売れてる商品を見る
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-400">
            注目・高報酬・季節トレンドから、動画にしやすい商品を探せます。見つけたらそのまま動画作成へ進めます。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/#hero"
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-gray-100"
            >
              動画を作る
            </Link>
            <nav
              aria-label="商品セクション"
              className="flex flex-wrap gap-2"
            >
              <a
                href="#featured"
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm text-gray-200 hover:bg-zinc-800"
              >
                🔥 注目
              </a>
              <a
                href="#high-reward"
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm text-gray-200 hover:bg-zinc-800"
              >
                💰 高報酬
              </a>
              <a
                href="#seasonal"
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm text-gray-200 hover:bg-zinc-800"
              >
                ☀️ 季節
              </a>
            </nav>
          </div>
        </header>

        {warning && (
          <p className="mt-6 text-sm text-amber-300/90">
            商品データの一部を取得できませんでした: {warning}
            <span className="mt-1 block text-xs text-gray-500">
              migration `20260711030000_product_discovery.sql` を適用してください
            </span>
          </p>
        )}

        {loading && (
          <p className="mt-10 text-sm text-gray-500">商品を読み込み中...</p>
        )}

        {!loading && (
          <>
            <ProductRail
              id="featured"
              title="🔥 今週の注目商品"
              subtitle="編集部が選んだ売りやすい商品"
              products={data.featured}
              emptyText="注目商品はまだありません。"
            />

            <ProductRail
              id="high-reward"
              title="💰 高報酬商品"
              subtitle="報酬率の高い商品をピックアップ"
              products={data.high_reward}
              emptyText="高報酬商品はまだありません。"
            />

            <ProductRail
              id="seasonal"
              title={seasonalTitle}
              subtitle="今の季節に合いやすい商品"
              products={data.seasonal}
              emptyText="季節トレンド商品はまだありません。"
            />
          </>
        )}
      </div>
    </main>
  );
}
