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
const PROMPT_PRESETS = [
  { label: "商品CM", text: "高級感のある商品CM。ゆっくりカメラが商品へ寄り、柔らかな光が輪郭を際立たせる。最後は商品を中央に美しく見せる。" },
  { label: "SNSリール", text: "SNS向けの短い縦動画。最初の1秒で目を引き、自然なカメラ移動とテンポのよい動き。最後は印象的なフレームで止まる。" },
  { label: "ブランド", text: "洗練されたブランドムービー。シネマティックな光、自然なカメラワーク、余白のある上質な演出。静かに余韻を残す。" },
];
const SIGNAL_DIRECTIVES = {\n  frame: "Creative priority: FRAME. Preserve subject identity, hierarchy, composition, and a deliberate final framing.",\n  direction: "Creative priority: DIRECTION. Prioritize premium light, material, color, atmosphere, and brand consistency.",\n  motion: "Creative priority: MOTION. Prioritize natural camera movement, believable physical motion, rhythm, and a strong opening.",\n} as const;\n\nconst REVIEW_POINTS = [
  "最初の1秒をもっと強く",
  "主役・商品をもっと見やすく",
  "動きをもっと自然に",
  "構図・余白を整える",
  "光・質感を上質に",
  "ブランドの雰囲気を揃える",
  "最後のフレームを強く",
];
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
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewPoints, setReviewPoints] = useState<string[]>([]);
  const [activeSignal, setActiveSignal] = useState<"frame" | "direction" | "motion">("motion");
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
    form.set("prompt", `${prompt.trim()}\n\n${SIGNAL_DIRECTIVES[activeSignal]}`);
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

  function applyReviewToNextPrompt() {
    const feedback = [...reviewPoints, reviewNotes.trim()].filter(Boolean).join("。");
    if (!feedback) return;
    const suffix = `\n\n前回の生成を見直した改善点：${feedback}。これらを優先して、より自然で完成度の高い映像にする。`;
    setPrompt((current) => current.trim() ? `${current.trim()}${suffix}` : feedback);
    setReviewNotes("");
    setReviewPoints([]);
  }

  const elapsed = pending && busy ? formatElapsed(now - pending.started_at) : null;
  const stepIndex = PHASE_STEPS.indexOf(phase);
  const buttonLabel = busy ? `${PHASE_LABEL[phase]}…${elapsed ? ` ${elapsed}` : ""}` : "Create video";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <section className="rounded-[1.75rem] border border-white/[0.09] bg-[#0b0b0e] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">01 / SOURCE</p>
          <div className="mt-2 flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold tracking-tight">Start with an idea</h2><p className="mt-1 text-sm text-zinc-400">画像を置いても、言葉だけでも始められます。</p></div><span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-500">{isSeedance ? "Image optional" : "Image required"}</span></div>
          <label className="mt-5 flex group/frame relative min-h-40 cursor-pointer items-center justify-center overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#08080a] px-5 text-center transition duration-500 hover:border-cyan-200/30 hover:bg-white/[0.025] focus-within:border-cyan-300/60 focus-within:ring-2 focus-within:ring-cyan-300/30"><div><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-zinc-400 transition group-hover/frame:border-cyan-200/30 group-hover/frame:text-cyan-200">＋</div><p className="text-sm font-medium text-zinc-200">{image ? image.name : "Drop a frame / choose an image"}</p><p className="mt-1 text-xs text-zinc-500">{isSeedance ? "JPG / PNG / WebP · 10MBまで · 画像なしでもOK" : "JPG / PNG / WebP · 10MBまで"}</p></div><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => { selectImage(e.target.files?.[0] || null); e.target.value = ""; }} /></label>
          {preview && (
            <div className="mt-4 flex items-start gap-3">
              {/* ローカルの blob URL プレビューのため next/image の最適化対象外 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="選択した参照画像のプレビュー" className="max-h-72 rounded-xl object-contain" />
              <button type="button" onClick={() => selectImage(null)} disabled={busy} className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-white/30 hover:text-white disabled:opacity-40">画像を外す</button>
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-white/[0.09] bg-[#0b0b0e] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">02 / DIRECT</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight"><label htmlFor="zenova-video-prompt">Describe the motion</label></h2>
          <p className="mt-1 text-sm text-zinc-400">普通の文章でOK。迷ったら下のプリセットを選んで、そこから書き換えられます。</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {PROMPT_PRESETS.map((preset) => (
              <button key={preset.label} type="button" disabled={busy} onClick={() => setPrompt(preset.text)}
                className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] text-zinc-300 transition hover:border-cyan-300/40 hover:text-white disabled:opacity-40">
                {preset.label}
              </button>
            ))}
          </div>
          <textarea
            id="zenova-video-prompt"
            value={prompt}
            maxLength={MAX_PROMPT_LENGTH}
            aria-describedby="zenova-video-prompt-count"
            onChange={(e) => setPrompt(e.target.value)}
            rows={7}
            placeholder="例：Golden-hour cinematic reveal, slow dolly-in, subtle camera orbit, premium editorial lighting, natural motion, clean final frame."
            className="mt-4 min-h-44 w-full resize-y rounded-[1.2rem] border border-zinc-800 bg-black px-4 pb-4 pt-9 text-sm leading-7 text-white placeholder:text-zinc-600 transition focus:border-cyan-300/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/20"
          />
          <p id="zenova-video-prompt-count" className="mt-2 text-right text-[11px] tabular-nums text-zinc-600">{prompt.trim().length.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()}</p>
        </section>

        <section className="rounded-[1.75rem] border border-white/[0.09] bg-[#0b0b0e] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">03 / CONTROL</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Shape the result</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <label className="text-sm text-zinc-400">長さ
              <select value={duration} onChange={(e) => setDuration(e.target.value)} disabled={busy} className="mt-2 min-h-11 w-full rounded-[0.9rem] border border-zinc-800 bg-black px-3 py-2 text-white transition hover:border-zinc-600 focus:border-cyan-300/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/20">
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
          <div className="mt-4 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.025] px-4 py-3 text-xs leading-5 text-zinc-400">
            <span className="text-cyan-200">Tip:</span> 「被写体 + 動き + カメラ + 光 + 最後の見せ場」を入れると、意図を伝えやすくなります。
          </div>
          <div className="mt-3 rounded-xl border border-white/5 bg-black/40 px-4 py-3 text-xs leading-5 text-zinc-500">{isSeedance ? "Seedance 2.5 · テキストから生成。画像を追加すると参照画像として構図に反映します。" : isKling ? "Kling · 出力比率は入力画像に合わせて生成されます。" : "画像から動きとカメラワークを生成。モデルごとに対応する表現が異なります。"}</div>
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

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Creative quality loop</span>
            <span className="text-[10px] text-cyan-300">AI → Review → Improve</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-500">まず1本を作り、完成映像を見て次のプロンプトを改善。ZENOVAは「生成したら終わり」ではなく、次の1本までを制作体験にします。</p>
        </div>

        <section className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#09090b] p-4 sm:p-5" aria-label="Creative signal">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-[9px] uppercase tracking-[0.26em] text-zinc-600">ZENOVA SIGNAL</span>
              <p className="mt-1 text-xs text-zinc-400">1つ選ぶと、次の指示の重心が変わります。</p>
            </div>
            <span className="hidden text-[9px] uppercase tracking-[0.2em] text-cyan-200/60 sm:block">Live direction</span>
          </div>
          <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {([
              ["frame", "01", "Frame", "構図・主役"],
              ["direction", "02", "Direction", "光・質感"],
              ["motion", "03", "Motion", "カメラ・動き"],
            ] as const).map(([key, number, label, detail]) => {
              const selected = activeSignal === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={busy}
                  onClick={() => setActiveSignal(key)}
                  className={`group relative min-h-20 border-r border-white/10 px-3 py-3 text-left last:border-r-0 transition ${selected ? "bg-cyan-300/[0.07] text-white" : "text-zinc-500 hover:bg-white/[0.025] hover:text-zinc-300"} disabled:cursor-not-allowed disabled:opacity-50`}
                  aria-pressed={selected}
                >
                  <span className={`text-[9px] tracking-[0.18em] ${selected ? "text-cyan-200" : "text-zinc-700"}`}>{number}</span>
                  <span className="mt-1 block text-xs font-medium">{label}</span>
                  <span className="mt-0.5 block text-[9px] text-zinc-600">{detail}</span>
                  <span className={`absolute bottom-0 left-3 right-3 h-px transition ${selected ? "bg-cyan-200 shadow-[0_0_12px_rgba(103,232,249,0.8)]" : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-zinc-500">
            {activeSignal === "frame" ? "Frame：商品・人物・背景の優先順位を明確に。" : activeSignal === "direction" ? "Direction：光、色、質感、ブランドの空気感を揃える。" : "Motion：カメラ移動、速度、自然な動きを主役にする。"}
          </p>
        </section>

        <div className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-3">
            <div><span className="text-[9px] uppercase tracking-[0.24em] text-zinc-600">READY STATE</span><p className="mt-1 text-xs text-zinc-400">Frame → Direction → Motion</p></div>
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.7)]" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void generate()}
          disabled={busy || phase === "stalled"}
          aria-busy={busy}
          className="group relative w-full overflow-hidden rounded-[1.25rem] bg-white px-5 py-4 text-base font-semibold text-black shadow-[0_12px_40px_rgba(255,255,255,0.08)] transition hover:-translate-y-0.5 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-wait disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <span className="relative z-10 tabular-nums">{buttonLabel}</span><span aria-hidden="true" className="absolute inset-y-0 right-0 w-24 translate-x-10 bg-gradient-to-l from-cyan-200/60 to-transparent opacity-0 transition duration-500 group-hover:translate-x-0 group-hover:opacity-100" />
        </button>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.11] bg-[#09090b] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.4)] sm:p-5">
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
          {busy && (
            <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.07] bg-black/40 px-3 py-3">
              <div className="relative flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                <span className={phase === "uploading" ? "text-cyan-200" : ""}>Send</span>
                <span className={phase === "queued" ? "text-cyan-200" : ""}>Queue</span>
                <span className={phase === "in_progress" ? "text-cyan-200" : ""}>Render</span>
                <span className="text-zinc-700">Reveal</span>
                <span className="absolute left-0 right-0 top-1/2 -z-0 h-px bg-white/10" />
                <span className="absolute left-0 top-1/2 h-px bg-cyan-200/70 shadow-[0_0_14px_rgba(103,232,249,0.7)] transition-all duration-700" style={{ width: phase === "uploading" ? "18%" : phase === "queued" ? "42%" : "76%" }} />
              </div>
            </div>
          )}
          <div className={`relative mx-auto mt-4 flex min-h-[200px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#050506] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)] ${outputAspect === "9:16" ? "aspect-[9/16] max-w-[260px]" : outputAspect === "1:1" ? "aspect-square w-full max-w-[320px]" : "aspect-video w-full"}`}>
            {result ? (
              <div className="zenova-reveal h-full w-full">
                <video src={result.video_url} controls playsInline className="h-full w-full object-contain" />
              </div>
            ) : busy ? (
              <div className="flex flex-col items-center gap-3 px-5 text-center" aria-hidden="true">
                <span className="relative h-12 w-12 rounded-full border border-white/10"><span className="absolute inset-1 rounded-full border border-cyan-200/20 border-t-cyan-200/80 animate-spin" /><span className="absolute inset-[13px] rounded-full bg-cyan-200/60 shadow-[0_0_24px_rgba(103,232,249,0.35)]" /></span><span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Rendering your frame</span>
              </div>
            ) : (
              <p className="px-5 text-center text-xs text-zinc-600"><span className="mx-auto block h-px w-10 bg-cyan-200/30" /><span className="mt-3 block text-[10px] uppercase tracking-[0.2em] text-zinc-600">Your frame will appear here</span></p>
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
        {result && (
          <section className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.025] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-200/70">04 / REVIEW</p>
                <h3 className="mt-1 text-sm font-semibold text-zinc-200">完成したら、ここで1回だけ見直す</h3>
              </div>
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">AI loop ready</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">気になった点を選ぶだけ。次の生成指示に反映して、1本ずつ精度を上げます。</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {REVIEW_POINTS.map((point) => {
                const selected = reviewPoints.includes(point);
                return (
                  <button key={point} type="button" onClick={() => setReviewPoints((current) => selected ? current.filter((item) => item !== point) : [...current, point])}
                    className={`rounded-full border px-3 py-1.5 text-[11px] transition ${selected ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-black/20 text-zinc-400 hover:border-white/25 hover:text-zinc-200"}`}>
                    {selected ? "✓ " : ""}{point}
                  </button>
                );
              })}
            </div>
            <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={2} placeholder="自由メモ：例「商品名を最後まで見せたい」「最初の1秒をもっと強く」" className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/30" />
            <button type="button" onClick={applyReviewToNextPrompt} disabled={!reviewPoints.length && !reviewNotes.trim()}
              className="mt-3 w-full rounded-xl bg-cyan-100 px-4 py-3 text-sm font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">
              次の生成に改善点を反映
            </button>
          </section>
        )}
      </aside>
    </div>
  );
}
