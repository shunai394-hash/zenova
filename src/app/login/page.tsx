"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/pricing";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    authError ? "ログインに失敗しました。もう一度お試しください。" : null
  );

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/pricing";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
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

      // Cookie セッション確立後にフル遷移（API がセッションを読めるようにする）
      window.location.assign(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setOauthLoading(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        },
      });
      if (oauthError) throw oauthError;
      // リダイレクトが発生するため、ここでは loading を戻さない
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setOauthLoading(false);
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

        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={loading || oauthLoading}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-600 bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-gray-100 disabled:opacity-40"
        >
          <GoogleIcon />
          {oauthLoading ? "リダイレクト中..." : "Googleでログイン"}
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-gray-500">
          <div className="h-px flex-1 bg-zinc-700" />
          <span>または</span>
          <div className="h-px flex-1 bg-zinc-700" />
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <label className="block text-sm text-gray-300">
            メールアドレス
            <input
              type="email"
              required
              autoComplete="email"
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
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
            />
          </label>

          {error && <p className="text-sm text-red-300">{error}</p>}
          {message && <p className="text-sm text-emerald-300">{message}</p>}

          <button
            type="submit"
            disabled={loading || oauthLoading}
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.227 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.084 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
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
