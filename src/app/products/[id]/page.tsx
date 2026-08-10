"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { DiscoveryProduct } from "@/lib/product-discovery";
import {
  formatAffiliateRatePercent,
  formatCategoryBadge,
  splitNameAndCategory,
} from "@/lib/product-discovery";

function formatYen(value: number | null): string {
  if (value == null) return "—";
  return `¥${value.toLocaleString("ja-JP")}`;
}

function labelTrend(value: string | null): string {
  switch ((value ?? "").toLowerCase()) {
    case "rising":
      return "上昇中";
    case "stable":
      return "安定";
    case "falling":
      return "下降気味";
    default:
      return value?.trim() || "—";
  }
}

function labelCompetition(value: string | null): string {
  switch ((value ?? "").toLowerCase()) {
    case "low":
      return "低";
    case "medium":
      return "中";
    case "high":
      return "高";
    default:
      return value?.trim() || "—";
  }
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [product, setProduct] = useState<DiscoveryProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/discovery/products/${id}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setProduct(null);
          setError(
            typeof data?.error === "string"
              ? data.error
              : "商品が見つかりません"
          );
          return;
        }
        setProduct((data.product as DiscoveryProduct) ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const score = Math.max(0, Math.min(100, product?.sales_score ?? 0));
  const display = product
    ? splitNameAndCategory(product.name, product.category)
    : null;
  const categoryBadge = display
    ? formatCategoryBadge(display.category)
    : null;

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/products"
            className="text-sm text-gray-400 underline hover:text-white"
          >
            ← 商品一覧へ
          </Link>
          <Link
            href="/#hero"
            className="text-sm text-gray-400 underline hover:text-white"
          >
            動画を作る
          </Link>
        </div>

        {loading && (
          <p className="mt-10 text-sm text-gray-500">読み込み中...</p>
        )}

        {error && <p className="mt-10 text-sm text-red-300">{error}</p>}

        {!loading && product && display && (
          <div className="mt-6 space-y-5">
            {/* 1. 商品ヘッダー */}
            <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
              <div className="aspect-[16/10] bg-zinc-950 sm:aspect-[21/9]">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={display.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-600">
                    No Image
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6">
                <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                  {display.name}
                </h1>
                {categoryBadge && (
                  <span className="mt-3 inline-flex rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-gray-300">
                    {categoryBadge}
                  </span>
                )}

                <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
                    <dt className="text-xs text-gray-500">価格</dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {formatYen(product.price)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
                    <dt className="text-xs text-gray-500">報酬率</dt>
                    <dd className="mt-1 text-sm font-semibold text-emerald-400">
                      {formatAffiliateRatePercent(product.affiliate_rate)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
                    <dt className="text-xs text-gray-500">1件利益</dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {formatYen(product.estimated_profit)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
                    <dt className="text-xs text-gray-500">売れる可能性</dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {product.sales_score ?? "—"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>sales_score</span>
                    <span>{score}/100</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 2. 販売理由カード */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">なぜこの商品が売れるか</h2>

              <div className="mt-4">
                <p className="text-xs text-gray-500">販売理由</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-200">
                  {product.sell_reason || "—"}
                </p>
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
                  <dt className="text-xs text-gray-500">トレンド</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {labelTrend(product.trend_direction)}
                  </dd>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
                  <dt className="text-xs text-gray-500">競合レベル</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {labelCompetition(product.competition_level)}
                  </dd>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
                  <dt className="text-xs text-gray-500">最適プラットフォーム</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {product.best_platform || "—"}
                  </dd>
                </div>
              </dl>
            </section>

            {/* 3. CTA */}
            <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
              <Link
                href={`/analyze?product=${encodeURIComponent(product.id)}`}
                className="flex w-full items-center justify-center rounded-xl bg-white px-5 py-4 text-base font-semibold text-black hover:bg-gray-100"
              >
                この商品で動画を作る
              </Link>
              <Link
                href={`/analyze?product=${encodeURIComponent(product.id)}`}
                className="flex w-full items-center justify-center rounded-xl border border-zinc-700 px-5 py-3.5 text-sm font-medium text-gray-200 hover:bg-zinc-800"
              >
                この商品を分析する
              </Link>
              <p className="text-center text-xs text-gray-500">
                分析ワークスペースへ進み、台本・動画生成まで続けられます
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
