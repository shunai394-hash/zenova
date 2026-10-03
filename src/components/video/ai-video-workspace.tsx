"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Result = {
  video_url: string;
  request_id: string;
  model: string;
  duration_sec: number;
  aspect_ratio: string;
  sound: boolean;
};

type Usage = {
  authenticated: boolean;
  remaining: number;
  used: number;
  video_limit: number;
  plan: string;
};

type Phase = "idle" | "uploading" | "queued" | "in_progress" | "completed" | "failed" | "stalled";

type PendingJob = { ticket: string; started_at: number; aspect_ratio: string };

const API_PATH = "/api/generate-higgsfield-video";
const PENDING_KEY = "zenova:pending-video-job";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PROMPT_LENGTH = 5000;
const POLL_INTERVAL_MS = 4000;
/** これを超えたら自動確認を止め、手動で再確認できる状態にする */
const POLL_GIVE_UP_MS = 15 * 60 * 1000;
const MAX_CONSECUTIVE_POLL_ERRORS = 5;

const PHASE_LABEL: Record<Phase, string> = {
  idle: "",
  uploading: "画像と指示を送信しています",
  queued: "生成の順番を待っています",
  in_progress: "Higgsfieldで映像を生成しています",
  completed: "完成しました",
  failed: "生成できませんでした",
  stalled: "まだ生成中の可能性があります",
};

const PHASE_STEPS: Phase[] = ["uploading", "queued", "in_progress", "completed"];

function readPending(): PendingJob | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingJob;
    return typeof parsed?.ticket === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function writePending(job: PendingJob | null) {
  try {
    if (job) window.localStorage.setItem(PENDING_KEY, JSON.stringify(job));
    else window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // ストレージが使えない環境でも生成自体は継続する
  }
}

/** HTML のエラーページ（Vercel のタイムアウト等）でも壊れないレスポンス解析 */
async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return { error: res.status === 504 ? "サーバーの応答がタイムアウトしました。" : `サーバーから予期しない応答がありました (HTTP ${res.status})` };
  }
}

function formatElapsed(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "画像形式は JPG・PNG・WebP に対応しています。";
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return "画像サイズは 10MB 以下にしてください。";
  return null;
}

export function AiVideoWorkspace() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("5");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [sound, setSound] = useState(true);
  const [model, setModel] = useState("bytedance/seedance-2.5/text-to-video");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [pending, setPending] = useState<PendingJob | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollErrors = useRef(0);
  const pollRef = useRef<(job: PendingJob) => Promise<void>>(async () => {});
  const isSeedance = model === "bytedance/seedance-2.5/text-to-video";
  const isKling = model.startsWith("kling-video/");
  const supportsAspectRatio = !isKling;
  const supportsSound = model !== "minimax/h3/image-to-video" && model !== "kling-video/v3.0-turbo/image-to-video";
  const busy = phase === "uploading" || phase === "queued" || phase === "in_progress";
  const outputAspect = result?.aspect_ratio ?? pending?.aspect_ratio ?? aspectRatio;

  const refreshUsage = useCallback(() => {
    fetch("/api/usage", { credentials: "same-origin", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUsage({
        authenticated: d.authenticated === true,
        remaining: Number(d.remaining ?? 0),
        used: Number(d.used ?? 0),
        video_limit: Number(d.video_limit ?? 0),
        plan: String(d.plan ?? "free"),
      }))
      .catch(() => {});
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = null;
  }, []);

  const poll = useCallback(async (job: PendingJob) => {
    stopPolling();
    if (Date.now() - job.started_at > POLL_GIVE_UP_MS) {
      setPhase("stalled");
      return;
    }
    try {
      const res = await fetch(`${API_PATH}?ticket=${encodeURIComponent(job.ticket)}`, { cache: "no-store" });
      const data = await readJson(res);
      if (!res.ok) {
        if (res.status === 401) {
          // ジョブは破棄せず、再ログイン後に確認できるようにする
          setPhase("stalled");
          setError("ログインの有効期限が切れました。再ログイン後に「もう一度確認」を押してください。");
          return;
        }
        const retryable = data.retryable === true || res.status >= 500;
        if (retryable && pollErrors.current < MAX_CONSECUTIVE_POLL_ERRORS) {
          pollErrors.current += 1;
          pollTimer.current = setTimeout(() => void pollRef.current(job), POLL_INTERVAL_MS * (pollErrors.current + 1));
          return;
        }
        if (retryable) {
          setPhase("stalled");
          setError(String(data.error || "生成状況を確認できませんでした。"));
          return;
        }
        throw new Error(String(data.error || `生成状況の確認に失敗しました (HTTP ${res.status})`));
      }
      pollErrors.current = 0;
      const status = String(data.status);
      if (status === "completed") {
        setResult(data as unknown as Result);
        setPhase("completed");
        setPending(null);
        writePending(null);
        refreshUsage();
        return;
      }
      if (status === "failed") throw new Error(String(data.error || "生成に失敗しました。"));
      setPhase(status === "queued" ? "queued" : "in_progress");
      pollTimer.current = setTimeout(() => void pollRef.current(job), POLL_INTERVAL_MS);
    } catch (e) {
      setPhase("failed");
      setPending(null);
      writePending(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [refreshUsage, stopPolling]);

  useEffect(() => { pollRef.current = poll; }, [poll]);

  useEffect(() => {
    refreshUsage();
    // ページ再読み込み後も進行中のジョブを再開する
    const saved = readPending();
    if (saved) {
      const resume = setTimeout(() => {
        setPending(saved);
        setPhase("queued");
        void poll(saved);
      }, 0);
      return () => { clearTimeout(resume); stopPolling(); };
    }
    return stopPolling;
  }, [poll, refreshUsage, stopPolling]);

  useEffect(() => {
    if (!busy) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [busy]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function selectImage(file: File | null) {
    setError("");
    if (file) {
      const problem = validateImage(file);
      if (problem) { setError(problem); return; }
    }
    setImage(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function generate() {
    setError("");
    setResult(null);
    if (!image && !isSeedance) return setError("このモデルでは画像を1枚選択してください。");
    if (!prompt.trim()) return setError("どんな動画にしたいか入力してください。");
    if (prompt.trim().length > MAX_PROMPT_LENGTH) return setError("プロンプトは 5,000 文字以内で入力してください。");
    if (usage && !usage.authenticated) return setError("動画を生成するにはログインしてください。");
    if (usage?.authenticated && usage.remaining <= 0) return setError("今月の動画生成枠を使い切りました。プランをご確認ください。");

    const form = new FormData();
    if (image) form.set("image", image);
    form.set("prompt", prompt.trim());
    form.set("duration", duration);
    form.set("aspect_ratio", aspectRatio);
    form.set("sound", sound ? "on" : "off");
    form.set("model", model);

    setPhase("uploading");
    setNow(Date.now());
    pollErrors.current = 0;
    try {
      const res = await fetch(API_PATH, { method: "POST", body: form });
      const data = await readJson(res);
      if (!res.ok || typeof data.ticket !== "string") {
        throw new Error(String(data.error || `生成を開始できませんでした (HTTP ${res.status})`));
      }
      const job: PendingJob = { ticket: data.ticket, started_at: Date.now(), aspect_ratio: String(data.aspect_ratio ?? aspectRatio) };
      setPending(job);
      writePending(job);
      setPhase("queued");
      pollTimer.current = setTimeout(() => void poll(job), POLL_INTERVAL_MS);
    } catch (e) {
      setPhase("failed");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function recheck() {
    if (!pending) return;
    setError("");
    pollErrors.current = 0;
    const job = { ...pending, started_at: Date.now() };
    setPending(job);
    writePending(job);
    setPhase("in_progress");
    void poll(job);
  }

  function discardPending() {
    stopPolling();
    setPending(null);
    writePending(null);
    setPhase("idle");
    setError("");
  }

  const elapsed = pending && busy ? formatElapsed(now - pending.started_at) : null;
  const stepIndex = PHASE_STEPS.indexOf(phase);
  const buttonLabel = busy ? `${PHASE_LABEL[phase]}…${elapsed ? ` ${elapsed}` : ""}` : "Create video";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">01 / SOURCE</p>
          <div className="mt-2 flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold tracking-tight">Start with an idea</h2><p className="mt-1 text-sm text-zinc-400">画像を置いても、言葉だけでも始められます。</p></div><span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-500">{isSeedance ? "Image optional" : "Image required"}</span></div>
          <label className="mt-5 flex min-h-32 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-5 text-center transition hover:border-white/25 hover:bg-white/[0.045] focus-within:border-cyan-300/60 focus-within:ring-2 focus-within:ring-cyan-300/30"><div><p className="text-sm font-medium text-zinc-200">{image ? image.name : "画像を追加"}</p><p className="mt-1 text-xs text-zinc-500">{isSeedance ? "JPG / PNG / WebP · 10MBまで · 画像なしでもOK" : "JPG / PNG / WebP · 10MBまで"}</p></div><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => { selectImage(e.target.files?.[0] || null); e.target.value = ""; }} /></label>
          {preview && (
            <div className="mt-4 flex items-start gap-3">
              {/* ローカルの blob URL プレビューのため next/image の最適化対象外 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="選択した参照画像のプレビュー" className="max-h-72 rounded-xl object-contain" />
              <button type="button" onClick={() => selectImage(null)} disabled={busy} className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-white/30 hover:text-white disabled:opacity-40">画像を外す</button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">02 / DIRECT</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight"><label htmlFor="zenova-video-prompt">Describe the motion</label></h2>
          <p className="mt-1 text-sm text-zinc-400">普通の文章で指示してください。CMに限定せず、SNS動画・紹介動画・映像作品などに使えます。</p>
          <textarea
            id="zenova-video-prompt"
            value={prompt}
            maxLength={MAX_PROMPT_LENGTH}
            aria-describedby="zenova-video-prompt-count"
            onChange={(e) => setPrompt(e.target.value)}
            rows={7}
            placeholder="例：Golden-hour cinematic reveal, slow dolly-in, subtle camera orbit, premium editorial lighting, natural motion, clean final frame."
            className="mt-4 w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/30"
          />
          <p id="zenova-video-prompt-count" className="mt-2 text-right text-[11px] tabular-nums text-zinc-600">{prompt.trim().length.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()}</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">03 / CONTROL</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Shape the result</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-sm text-zinc-400">長さ
              <select value={duration} onChange={(e) => setDuration(e.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white">
                <option value="5">5秒</option><option value="10">10秒</option><option value="15">15秒</option>
              </select>
            </label>
            <label className="text-sm text-zinc-400">画面比率
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} disabled={busy || !supportsAspectRatio} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40">
                <option value="9:16">9:16 縦</option><option value="16:9">16:9 横</option><option value="1:1">1:1 正方形</option>
              </select>
            </label>
            <label className="text-sm text-zinc-400">モデル
              <select value={model} onChange={(e) => setModel(e.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white">
                <option value="bytedance/seedance-2.5/text-to-video">Seedance 2.5（Text to Video）</option><option value="alibaba/wan-3.0-prime/image-to-video">Wan 3.0 Prime（Image to Video）</option>
                <option value="kling-video/v3.0/pro/image-to-video">Kling 3.0 Pro（高品質）</option>
                <option value="kling-video/v3.0-turbo/image-to-video">Kling 3.0 Turbo（高速）</option>
                <option value="minimax/h3/image-to-video">MiniMax H3（比率対応）</option>
              </select>
            </label>
          </div>
          <div className="mt-4 rounded-xl border border-white/5 bg-black/40 px-4 py-3 text-xs leading-5 text-zinc-500">{isSeedance ? "Seedance 2.5 · テキストから生成。画像を追加すると参照画像として構図に反映します。" : isKling ? "Kling · 出力比率は入力画像に合わせて生成されます。" : "画像から動きとカメラワークを生成。モデルごとに対応する表現が異なります。"}</div>
          <label className="mt-4 flex items-center gap-3 text-sm text-zinc-300">
            <input type="checkbox" checked={sound} disabled={busy || !supportsSound} onChange={(e) => setSound(e.target.checked)} className="disabled:cursor-not-allowed disabled:opacity-40" />
            AI音声・サウンドを生成 {!supportsSound && <span className="text-xs text-zinc-600">（このモデルでは非対応）</span>}
          </label>
        </section>

        {usage?.authenticated && (
          <div className="flex items-center justify-between text-xs text-zinc-500"><span>利用状況：残り {usage.remaining} 本</span><span>{usage.plan}</span></div>
        )}
        {usage && !usage.authenticated && (
          <p className="text-xs text-zinc-500">動画の生成には<a href="/login" className="mx-1 text-zinc-200 underline underline-offset-4 hover:text-white">ログイン</a>が必要です。</p>
        )}

        {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}

        {phase === "stalled" && pending && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-950/10 p-4 text-sm text-amber-200">
            <span className="min-w-0 flex-1">自動確認を停止しました。生成はサーバー側で続いている場合があります。</span>
            <button type="button" onClick={recheck} className="rounded-full border border-amber-300/40 px-3 py-1.5 text-xs hover:bg-amber-300/10">もう一度確認</button>
            <button type="button" onClick={discardPending} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white">破棄する</button>
          </div>
        )}

        <button
          type="button"
          onClick={() => void generate()}
          disabled={busy || phase === "stalled"}
          aria-busy={busy}
          className="group w-full rounded-2xl bg-white px-5 py-4 text-base font-semibold text-black shadow-[0_12px_40px_rgba(255,255,255,0.08)] transition hover:-translate-y-0.5 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-wait disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <span className="tabular-nums">{buttonLabel}</span>
        </button>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.02] p-4 shadow-2xl shadow-black/30 sm:p-5">
          <div className="flex items-center justify-between"><div><p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">OUTPUT</p><h2 className="mt-1 text-base font-semibold">Your video</h2></div><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-500">Preview</span></div>
          <ol aria-label="生成の進行状況" className="mt-4 grid grid-cols-4 gap-1.5">
            {PHASE_STEPS.map((step, i) => (
              <li key={step} className="space-y-1.5">
                <span className={`block h-1 rounded-full transition-colors ${phase === "failed" && i >= Math.max(0, stepIndex) ? "bg-red-400/40" : stepIndex >= i ? "bg-cyan-300/80" : "bg-white/10"} ${phase === step && busy ? "animate-pulse" : ""}`} />
                <span className={`block text-[9px] uppercase tracking-[0.14em] ${stepIndex >= i ? "text-zinc-300" : "text-zinc-600"}`}>{["Send", "Queue", "Render", "Done"][i]}</span>
              </li>
            ))}
          </ol>
          <p role="status" aria-live="polite" className="mt-3 min-h-5 text-xs text-zinc-400">
            {phase === "idle" ? "" : `${PHASE_LABEL[phase]}${busy ? "…" : ""}`}{elapsed ? <span className="ml-2 tabular-nums text-zinc-600">{elapsed}</span> : null}
          </p>
          {busy && <p className="mt-1 text-[11px] leading-5 text-zinc-600">通常 1〜5 分ほどかかります。ページを閉じても、再度開くと続きから確認します。</p>}
          <div className={`mx-auto mt-4 flex min-h-[200px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-zinc-700 bg-black ${outputAspect === "9:16" ? "aspect-[9/16] max-w-[260px]" : outputAspect === "1:1" ? "aspect-square w-full max-w-[320px]" : "aspect-video w-full"}`}>
            {result ? (
              <video src={result.video_url} controls playsInline className="h-full w-full object-contain" />
            ) : busy ? (
              <div className="flex flex-col items-center gap-3 px-5 text-center" aria-hidden="true">
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-cyan-300/80" />
                <span className="text-xs text-zinc-500">Rendering</span>
              </div>
            ) : (
              <p className="px-5 text-center text-xs text-zinc-600">生成するとここに表示されます</p>
            )}
          </div>
          {result && (
            <div className="mt-4 space-y-2">
              <a href={result.video_url} target="_blank" rel="noreferrer" className="block rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm hover:border-zinc-500">
                動画を開く
              </a>
              <p className="text-[11px] leading-5 text-zinc-600">{result.duration_sec}秒 · {result.aspect_ratio} · {result.sound ? "サウンドあり" : "サウンドなし"}</p>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
