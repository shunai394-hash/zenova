"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { PlanRecord } from "@/lib/usage";

function formatPrice(price: number): string {
  if (price <= 0) return "¥0";
  return `¥${price.toLocaleString("ja-JP")}`;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const planId = (searchParams.get("plan") ?? "").trim().toLowerCase();
  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";
  const demo = searchParams.get("demo") === "1";

  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/plans");
        const data = await res.json();
        if (cancelled) return;
        setPlans(Array.isArray(data?.plans) ? (data.plans as PlanRecord[]) : []);
        if (Array.isArray(data?.warnings) && data.warnings.length > 0) {
          setWarning(data.warnings.join(" / "));
        } else {
          setWarning(null);
        }
      } catch (err) {
        if (cancelled) return;
        setPlans([]);
        setWarning(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => plans.find((p) => p.id === planId) ?? null,
    [plans, planId]
  );

  const startCheckout = async () => {
    if (!selected || selected.id === "free") return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: selected.id }),
      });
      const data = await res.json();
      if (res.status === 401) {
        const next = `/checkout?plan=${encodeURIComponent(selected.id)}`;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
        return;
      }
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Checkout に失敗しました"
        );
      }
      if (typeof data.url === "string" && data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.demo && typeof data.activate_url === "string") {
        // Stripe 未設定 → デモ有効化へ
        window.location.href = data.activate_url;
        return;
      }
      throw new Error("Checkout URL が返りませんでした");
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : String(err));
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-xl">
        <header className="border-b border-zinc-900 pb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
            Checkout
          </p>
          <h1 className="mt-2 text-3xl font-bold">プラン確認</h1>
          <p className="mt-2 text-sm text-gray-400">
            Stripe Checkout で安全に決済できます。キー未設定時はデモ有効化になります。
          </p>
        </header>

        {success && (
          <p className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
            {demo
              ? "デモでプランを有効化しました。Analyze で利用回数を確認してください。"
              : "お支払いが完了しました。プランが反映されるまで数秒かかることがあります。"}
          </p>
        )}

        {canceled && (
          <p className="mt-6 rounded-xl border border-amber-500/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
            決済がキャンセルされました。必要なら再度お試しください。
          </p>
        )}

        {warning && (
          <p className="mt-6 text-sm text-amber-300/90">{warning}</p>
        )}

        {loading && (
          <p className="mt-10 text-sm text-gray-500">読み込み中...</p>
        )}

        {!loading && !planId && (
          <div className="mt-10 space-y-4">
            <p className="text-sm text-gray-400">
              プランが指定されていません。
            </p>
            <Link
              href="/pricing"
              className="inline-block rounded bg-white px-4 py-2 text-sm font-medium text-black"
            >
              料金プランへ戻る
            </Link>
          </div>
        )}

        {!loading && planId && !selected && (
          <div className="mt-10 space-y-4">
            <p className="text-sm text-gray-400">
              プラン「{planId}」が見つかりませんでした。
            </p>
            <Link
              href="/pricing"
              className="inline-block rounded border border-zinc-700 px-4 py-2 text-sm text-gray-300 hover:bg-zinc-900"
            >
              料金プランへ戻る
            </Link>
          </div>
        )}

        {!loading && selected && (
          <section className="mt-10 rounded-xl border border-zinc-800 bg-zinc-950/80 p-6">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              選択中のプラン
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{selected.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{selected.id}</p>

            <p className="mt-6">
              <span className="text-3xl font-bold">
                {formatPrice(selected.price)}
              </span>
              <span className="ml-1 text-sm text-gray-500">/ 月</span>
            </p>

            <dl className="mt-6 space-y-2 border-t border-zinc-800 pt-5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">動画生成数</dt>
                <dd>
                  {selected.video_limit <= 0
                    ? "0（クレジット別途）"
                    : `月 ${selected.video_limit} 本`}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">画像生成数</dt>
                <dd>月 {selected.image_limit} 枚</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">商品分析</dt>
                <dd>月 {selected.analysis_limit} 回</dd>
              </div>
            </dl>

            {checkoutError && (
              <p className="mt-4 text-sm text-red-300">{checkoutError}</p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {selected.id === "free" ? (
                <Link
                  href="/analyze"
                  className="rounded bg-white px-4 py-2.5 text-sm font-medium text-black"
                >
                  Free で Analyze を始める
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => void startCheckout()}
                  disabled={checkoutLoading}
                  className="rounded bg-white px-4 py-2.5 text-sm font-medium text-black disabled:opacity-40"
                >
                  {checkoutLoading
                    ? "準備中..."
                    : "Stripe で支払う / プランを有効化"}
                </button>
              )}
              <Link
                href="/pricing"
                className="rounded border border-zinc-700 px-4 py-2.5 text-sm text-gray-300 hover:bg-zinc-900"
              >
                プランを選び直す
              </Link>
              <Link
                href="/analyze"
                className="rounded border border-zinc-700 px-4 py-2.5 text-sm text-gray-300 hover:bg-zinc-900"
              >
                Analyze へ
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black px-4 py-10 text-white">
          <p className="text-sm text-gray-500">読み込み中...</p>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
