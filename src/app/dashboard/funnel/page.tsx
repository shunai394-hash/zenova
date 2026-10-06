"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Stage = { event: string; count: number; rate_from_landing: number };

const LABELS: Record<string, string> = {
  landing_view: "Landing訪問",
  cta_click: "CTAクリック",
  product_input: "商品入力",
  analysis_started: "分析開始",
  video_generation_started: "動画生成開始",
  video_generation_succeeded: "動画生成成功",
  pricing_view: "料金ページ",
  checkout_started: "Checkout開始",
  checkout_succeeded: "決済成功",
  lead_captured: "リード獲得",
};

export default function FunnelPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/funnel/summary", { credentials: "same-origin" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "取得に失敗しました");
        setStages(Array.isArray(data?.stages) ? data.stages : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-900 pb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Sales Funnel</p>
            <h1 className="mt-2 text-3xl font-bold">実測セールスファネル</h1>
            <p className="mt-2 text-sm text-gray-400">架空KPIは表示せず、ZENOVA内で記録されたイベントだけを集計します。</p>
          </div>
          <Link href="/analyze" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-gray-300 hover:bg-zinc-900">Analyzeへ</Link>
        </header>

        {error ? (
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-950/20 p-5 text-sm text-red-200">{error}</div>
        ) : (
          <section className="mt-8 grid gap-3">
            {stages.map((stage, index) => {
              const previous = stages[index - 1]?.count ?? 0;
              const stepRate = previous > 0 ? Math.round((stage.count / previous) * 1000) / 10 : 0;
              return (
                <article key={stage.event} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{LABELS[stage.event] ?? stage.event}</p>
                      <p className="mt-1 text-xs text-gray-500">{stage.event}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{stage.count.toLocaleString("ja-JP")}</p>
                      <p className="text-xs text-gray-500">Landing比 {stage.rate_from_landing}%{index > 0 ? " · 前段比 " + stepRate + "%" : ""}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <p className="mt-8 text-xs leading-relaxed text-gray-600">この画面は売上を保証するものではありません。イベント計測の実測値を使って、どこでユーザーが離脱しているかを確認するための運用画面です。</p>
      </div>
    </main>
  );
}
