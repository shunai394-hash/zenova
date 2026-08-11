"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { UsageSummary } from "@/lib/usage";

/** Analyze: 動画生成の利用状況表示 */
export function UsageMeterBanner({
  refreshToken = 0,
}: {
  /** 生成成功後などにインクリメントして再取得 */
  refreshToken?: number;
}) {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/usage", { credentials: "same-origin" });
      const data = await res.json();
      if (!res.ok && data?.authenticated !== false && !data?.plan) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "利用状況を取得できませんでした"
        );
        return;
      }
      setSummary({
        plan: String(data.plan ?? "free"),
        video_limit: Number(data.video_limit ?? 0),
        used: Number(data.used ?? 0),
        remaining: Number(data.remaining ?? 0),
        extra_credit: Number(data.extra_credit ?? 0),
      });
      // 明示的な false のときだけ未ログイン扱い（欠落で誤誘導しない）
      setAuthenticated(
        data?.authenticated === false
          ? false
          : data?.authenticated === true
            ? true
            : null
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  if (error) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-xs text-gray-500">
        利用状況を取得できませんでした（{error}）
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-xs text-gray-500">
        利用状況を読み込み中...
      </div>
    );
  }

  const plan = summary.plan.toLowerCase() || "free";
  const isFree = plan === "free";
  const limited = isFree || summary.remaining <= 0;
  const remaining = Math.max(0, summary.remaining);

  return (
    <div
      className={`rounded-xl border px-4 py-4 ${
        limited
          ? "border-amber-500/40 bg-amber-950/20"
          : "border-zinc-800 bg-zinc-950/80"
      }`}
    >
      <p className="text-sm font-medium text-white">動画生成</p>
      {isFree ? (
        <p className="mt-2 text-sm text-gray-200">
          Free プランでは動画生成を利用できません
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-gray-200">
            {summary.used} / {summary.video_limit}回使用済み
          </p>
          {!limited ? (
            <p className="mt-1 text-xs text-gray-400">残り{remaining}回</p>
          ) : (
            <p className="mt-2 text-sm text-amber-200">
              今月の生成回数を使い切りました
            </p>
          )}
        </>
      )}

      {limited && (
        <div className="mt-3 space-y-3">
          {authenticated === false && (
            <p className="text-xs text-gray-400">
              プラン契約にはログインが必要です
            </p>
          )}
          <Link
            href={authenticated === false ? "/login?next=/pricing" : "/pricing"}
            className="inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-gray-200"
          >
            {isFree ? "アップグレードする" : "料金プランを見る"}
          </Link>
        </div>
      )}

      {summary.extra_credit > 0 && !limited && (
        <p className="mt-1 text-xs text-emerald-400">
          追加クレジット +{summary.extra_credit}
        </p>
      )}
      <p className="mt-2 text-[11px] text-gray-600">
        プラン: {summary.plan || "—"}
      </p>
    </div>
  );
}
