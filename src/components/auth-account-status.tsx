"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * ログイン中ユーザーの email 表示 + ログアウト。
 * Auth フローは変更せず、Supabase Auth の現在セッションを読むだけ。
 */
export function AuthAccountStatus({
  loginNext = "/analyze",
}: {
  loginNext?: string;
}) {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled) {
          setEmail(user?.email?.trim() || null);
        }
      } catch {
        if (!cancelled) setEmail(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // セッション破棄に失敗してもログイン画面へ
    }
    const next =
      loginNext.startsWith("/") && !loginNext.startsWith("//")
        ? loginNext
        : "/analyze";
    window.location.assign(
      `/login?next=${encodeURIComponent(next)}`
    );
  };

  if (!ready) {
    return (
      <span className="text-[11px] text-gray-600" aria-hidden>
        …
      </span>
    );
  }

  if (!email) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(loginNext)}`}
        className="rounded border border-zinc-700 px-2.5 py-1 text-[11px] text-gray-300 hover:bg-zinc-900 hover:text-white"
      >
        ログイン
      </Link>
    );
  }

  return (
    <div className="flex max-w-[min(100%,18rem)] items-center gap-2">
      <p
        className="truncate text-[11px] text-gray-400"
        title={email}
      >
        <span className="text-gray-600">ログイン中: </span>
        <span className="text-gray-200">{email}</span>
      </p>
      <button
        type="button"
        onClick={() => void logout()}
        disabled={loggingOut}
        className="shrink-0 rounded border border-zinc-700 px-2 py-1 text-[11px] text-gray-300 hover:bg-zinc-900 hover:text-white disabled:opacity-40"
      >
        {loggingOut ? "…" : "ログアウト"}
      </button>
    </div>
  );
}
