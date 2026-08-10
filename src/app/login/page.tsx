"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/pricing";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    authError ? "ログインに失敗しました。もう一度お試しください。" : null
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (signUpError) throw signUpError;
        setMessage(
          "確認メールを送信しました。メール内のリンクからログインを完了してください。"
        );
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-4 py-16 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <p className="text-center text-xs tracking-[0.2em] text-gray-500">
          ZENOVA
        </p>
        <h1 className="mt-4 text-center text-2xl font-bold">ログイン</h1>
        <p className="mt-3 text-center text-sm text-gray-400">
          Supabase Auth でプラン契約と利用枠をアカウントに紐付けます。
        </p>

        <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4">
          <label className="block text-sm text-gray-300">
            メールアドレス
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
            />
          </label>
          <label className="block text-sm text-gray-300">
            パスワード
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
            />
          </label>

          {error && <p className="text-sm text-red-300">{error}</p>}
          {message && <p className="text-sm text-emerald-300">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-gray-100 disabled:opacity-40"
          >
            {loading
              ? "処理中..."
              : mode === "signin"
                ? "ログイン"
                : "アカウント作成"}
          </button>
        </form>

        <button
          type="button"
          onClick={() =>
            setMode((m) => (m === "signin" ? "signup" : "signin"))
          }
          className="mt-4 w-full text-center text-sm text-gray-400 underline hover:text-gray-200"
        >
          {mode === "signin"
            ? "アカウントを作成する"
            : "すでにアカウントがある方はログイン"}
        </button>

        <div className="mt-8 flex flex-col gap-3 text-center">
          <Link
            href="/pricing"
            className="text-sm text-gray-400 underline hover:text-gray-200"
          >
            料金プランを見る
          </Link>
          <Link
            href="/analyze"
            className="text-sm text-gray-500 underline hover:text-gray-300"
          >
            Analyze へ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black px-4 py-16 text-white">
          <p className="text-center text-sm text-gray-500">読み込み中...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
