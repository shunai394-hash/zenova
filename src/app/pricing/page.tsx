"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PlanRecord } from "@/lib/usage";

const PLAN_ORDER = ["free", "starter", "pro"] as const;

type PlanId = (typeof PLAN_ORDER)[number];

const RECOMMENDED_PLAN_ID: PlanId = "pro";

const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: [
    "商品分析・企画作成",
    "動画生成は利用不可",
    "アップグレードで生成開始",
  ],
  starter: [
    "月10本まで動画生成",
    "商品分析・画像生成",
    "ナレーション / 字幕",
    "生成動画履歴",
  ],
  pro: [
    "月50本まで動画生成",
    "Starter の全機能",
    "高頻度の動画量産向け",
    "複数商品の並行運用",
  ],
};

const PLAN_BLURBS: Record<PlanId, string> = {
  free: "分析と企画の下書きから",
  starter: "販売動画を本格スタート",
  pro: "量産・複数商品向け",
};

function formatPrice(price: number): string {
  if (price <= 0) return "¥0";
  return `¥${price.toLocaleString("ja-JP")}`;
}

function formatCount(n: number, unit: string): string {
  return `月 ${n.toLocaleString("ja-JP")}${unit}`;
}

function isPlanId(id: string): id is PlanId {
  return (PLAN_ORDER as readonly string[]).includes(id);
}

function sortPlans(plans: PlanRecord[]): PlanRecord[] {
  return [...plans].sort((a, b) => {
    const ai = PLAN_ORDER.indexOf(a.id as PlanId);
    const bi = PLAN_ORDER.indexOf(b.id as PlanId);
    const aRank = ai === -1 ? 999 : ai;
    const bRank = bi === -1 ? 999 : bi;
    if (aRank !== bRank) return aRank - bRank;
    return a.price - b.price;
  });
}

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/plans");
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data?.plans)
          ? sortPlans(
              (data.plans as PlanRecord[]).filter((p) => isPlanId(p.id))
            )
          : [];
        setPlans(list);
        if (Array.isArray(data?.warnings) && data.warnings.length > 0) {
          setWarning(data.warnings.join(" / "));
        } else if (!data?.supabase_ok) {
          setWarning("プラン情報を取得できませんでした");
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

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-900 pb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
              ZENOVA Pricing
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">料金プラン</h1>
            <p className="mt-2 max-w-xl text-sm text-gray-400">
              Free では動画生成は利用できません。Starter / Pro
              で月間の生成枠を取得できます。
            </p>
          </div>
          <Link
            href="/analyze"
            className="rounded border border-zinc-700 px-3 py-2 text-sm text-gray-300 hover:bg-zinc-900"
          >
            ← Analyze
          </Link>
        </header>

        {warning && (
          <p className="mt-6 text-sm text-amber-300/90">
            {warning}
            {plans.length === 0
              ? "（Supabase の plans テーブルを確認してください）"
              : ""}
          </p>
        )}

        {loading && (
          <p className="mt-10 text-sm text-gray-500">プランを読み込み中...</p>
        )}

        {!loading && plans.length === 0 && (
          <p className="mt-10 text-sm text-gray-500">
            表示できるプランがありません。migration を適用してください。
          </p>
        )}

        {!loading && plans.length > 0 && (
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {plans.map((plan) => {
              const id = isPlanId(plan.id) ? plan.id : null;
              const recommended = plan.id === RECOMMENDED_PLAN_ID;
              const features = id ? PLAN_FEATURES[id] : ["基本機能"];
              const blurb = id ? PLAN_BLURBS[id] : "";

              return (
                <article
                  key={plan.id}
                  className={`relative flex flex-col rounded-xl border p-6 ${
                    recommended
                      ? "border-white bg-zinc-900/90 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                      : "border-zinc-800 bg-zinc-950/70"
                  }`}
                >
                  {recommended && (
                    <span className="absolute -top-3 left-6 rounded bg-white px-2.5 py-1 text-[11px] font-semibold tracking-wide text-black">
                      おすすめ
                    </span>
                  )}

                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-xl font-semibold">{plan.name}</h2>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {plan.id}
                    </p>
                  </div>

                  {blurb && (
                    <p className="mt-2 text-sm text-gray-400">{blurb}</p>
                  )}

                  <p className="mt-5">
                    <span className="text-3xl font-bold tracking-tight">
                      {formatPrice(plan.price)}
                    </span>
                    <span className="ml-1 text-sm text-gray-500">/ 月</span>
                  </p>

                  <dl className="mt-5 space-y-2 border-t border-zinc-800 pt-5 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">動画生成数</dt>
                      <dd className="text-right text-gray-200">
                        {plan.video_limit <= 0
                          ? "利用不可"
                          : formatCount(plan.video_limit, " 本")}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      機能一覧
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-gray-300">
                      {features.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.id === "free" ? (
                    <Link
                      href="/analyze"
                      className="mt-6 block w-full rounded border border-zinc-700 px-4 py-2.5 text-center text-sm font-medium text-gray-200 transition hover:bg-zinc-900"
                    >
                      Free で続ける
                    </Link>
                  ) : (
                    <Link
                      href={`/checkout?plan=${encodeURIComponent(plan.id)}`}
                      className={`mt-6 block w-full rounded px-4 py-2.5 text-center text-sm font-medium transition ${
                        recommended
                          ? "bg-white text-black hover:bg-gray-200"
                          : "border border-zinc-700 text-gray-200 hover:bg-zinc-900"
                      }`}
                    >
                      このプランを選択
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-gray-600">
          決済は Stripe Checkout。ログイン済みアカウントに Customer
          を紐付けます。
        </p>
      </div>
    </main>
  );
}
