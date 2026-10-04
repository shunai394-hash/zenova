"use client";

import { useEffect, useState } from "react";

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

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

export function AiVideoWorkspace() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("5");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [sound, setSound] = useState(true);
  const [model, setModel] = useState("bytedance/seedance-2.5/text-to-video");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const isSeedance = model === "bytedance/seedance-2.5/text-to-video";
  const isKling = model.startsWith("kling-video/");
  const supportsAspectRatio = !isKling;
  const supportsSound =
    model !== "minimax/h3/image-to-video" &&
    model !== "kling-video/v3.0-turbo/image-to-video";

  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  useEffect(() => {
    fetch("/api/usage", { credentials: "same-origin" })
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

  async function pollVideo(requestId: string): Promise<Result> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const res = await fetch(
        `/api/generate-higgsfield-video/status?request_id=${encodeURIComponent(requestId)}`,
        { credentials: "same-origin", cache: "no-store" }
      );
      const data = await res.json();

      if (!res.ok && data.status !== "processing") {
        throw new Error(data.error || `ステータス取得失敗 (HTTP ${res.status})`);
      }

      const current = String(data.status || "processing").toLowerCase();

      if (current === "completed") {
        if (!data.video_url) throw new Error("動画URLが返りませんでした");
        return {
          video_url: String(data.video_url),
          request_id: requestId,
          model,
          duration_sec: Number(duration),
          aspect_ratio: aspectRatio,
          sound,
        };
      }

      if (current === "failed" || current === "error") {
        throw new Error(data.error || "Higgsfieldで動画生成に失敗しました");
      }

      setStatus(
        current === "queued"
          ? "生成キューに入りました…"
          : "Higgsfieldで動画を生成しています…"
      );
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(
      "生成に時間がかかっています。request_id を保持したまま再試行できる状態です。"
    );
  }

  async function generate() {
    setError("");
    setResult(null);

    if (!image && !isSeedance) {
      setError("このモデルでは画像を1枚選択してください。");
      return;
    }
    if (!prompt.trim()) {
      setError("どんな動画にしたいか入力してください。");
      return;
    }
    if (usage && !usage.authenticated) {
      setError("ログインしてください。");
      return;
    }

    setStatus("画像をアップロードしています…");
    const form = new FormData();
    if (image) form.set("image", image);
    form.set("prompt", prompt.trim());
    form.set("duration", duration);
    form.set("aspect_ratio", aspectRatio);
    form.set("sound", sound ? "on" : "off");
    form.set("model", model);

    try {
      const res = await fetch("/api/generate-higgsfield-video", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok && res.status !== 202) {
        throw new Error(data.error || `生成開始失敗 (HTTP ${res.status})`);
      }
      if (!data.request_id) {
        throw new Error("Higgsfieldのrequest_idが返りませんでした");
      }

      setStatus("生成を開始しました。Higgsfieldでレンダリング中…");
      const completed = await pollVideo(String(data.request_id));

      setResult(completed);
      setStatus("完成しました。");
      setUsage((prev) =>
        prev
          ? {
              ...prev,
              used: prev.used + 1,
              remaining: Math.max(0, prev.remaining - 1),
            }
          : prev
      );
    } catch (e) {
      setStatus("");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">01 / SOURCE</p>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Start with an idea</h2>
              <p className="mt-1 text-sm text-zinc-400">画像を置いても、言葉だけでも始められます。</p>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
              {isSeedance ? "Image optional" : "Image required"}
            </span>
          </div>
          <label className="mt-5 flex min-h-32 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-5 text-center transition hover:border-white/25 hover:bg-white/[0.045]">
            <div>
              <p className="text-sm font-medium text-zinc-200">{image ? image.name : "画像を追加"}</p>
              <p className="mt-1 text-xs text-zinc-500">{isSeedance ? "JPG / PNG / WebP · 画像なしでもOK" : "JPG / PNG / WebP"}</p>
            </div>
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
          </label>
          {preview && <img src={preview} alt="" className="mt-4 max-h-72 rounded-xl object-contain" />}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">02 / DIRECT</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Describe the motion</h2>
          <p className="mt-1 text-sm text-zinc-400">普通の文章で指示してください。CMに限定せず、SNS動画・紹介動画・映像作品などに使えます。</p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={7}
            placeholder="例：Golden-hour cinematic reveal, slow dolly-in, subtle camera orbit, premium editorial lighting, natural motion, clean final frame."
            className="mt-4 w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">03 / CONTROL</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Shape the result</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-sm text-zinc-400">長さ
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white">
                <option value="5">5秒</option><option value="10">10秒</option><option value="15">15秒</option>
              </select>
            </label>
            <label className="text-sm text-zinc-400">画面比率
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} disabled={!supportsAspectRatio} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40">
                <option value="9:16">9:16 縦</option><option value="16:9">16:9 横</option><option value="1:1">1:1 正方形</option>
              </select>
            </label>
            <label className="text-sm text-zinc-400">モデル
              <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white">
                <option value="bytedance/seedance-2.5/text-to-video">Seedance 2.5（Text to Video）</option>
                <option value="alibaba/wan-3.0-prime/image-to-video">Wan 3.0 Prime（Image to Video）</option>
                <option value="kling-video/v3.0/pro/image-to-video">Kling 3.0 Pro（高品質）</option>
                <option value="kling-video/v3.0-turbo/image-to-video">Kling 3.0 Turbo（高速）</option>
                <option value="minimax/h3/image-to-video">MiniMax H3（比率対応）</option>
              </select>
            </label>
          </div>
          <div className="mt-4 rounded-xl border border-white/5 bg-black/40 px-4 py-3 text-xs leading-5 text-zinc-500">
            {isSeedance
              ? "Seedance 2.5 · テキストから生成。画像を追加すると参照画像として構図に反映します。"
              : isKling
                ? "Kling · 出力比率は入力画像に合わせて生成されます。"
                : "画像から動きとカメラワークを生成。モデルごとに対応する表現が異なります。"}
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm text-zinc-300">
            <input type="checkbox" checked={sound} disabled={!supportsSound} onChange={(e) => setSound(e.target.checked)} className="disabled:cursor-not-allowed disabled:opacity-40" />
            AI音声・サウンドを生成 {!supportsSound && <span className="text-xs text-zinc-600">（このモデルでは非対応）</span>}
          </label>
        </section>

        {usage?.authenticated && (
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>利用状況：残り {usage.remaining} 本</span><span>{usage.plan}</span>
          </div>
        )}

        {error && <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}

        <button
          type="button"
          onClick={() => void generate()}
          disabled={status.endsWith("…")}
          className="group w-full rounded-2xl bg-white px-5 py-4 text-base font-semibold text-black shadow-[0_12px_40px_rgba(255,255,255,0.08)] transition hover:-translate-y-0.5 hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-50"
        >
          {status || "Create video"}
        </button>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.02] p-4 shadow-2xl shadow-black/30 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">OUTPUT</p>
              <h2 className="mt-1 text-base font-semibold">Your video</h2>
            </div>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-500">Preview</span>
          </div>
          <div className={`mx-auto mt-4 flex min-h-[360px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-zinc-700 bg-black ${aspectRatio === "9:16" ? "aspect-[9/16] max-w-[260px]" : aspectRatio === "1:1" ? "aspect-square w-full max-w-[320px]" : "aspect-video w-full"}`}>
            {result ? <video src={result.video_url} controls playsInline className="h-full w-full object-contain" /> : <p className="px-5 text-center text-xs text-zinc-600">生成するとここに表示されます</p>}
          </div>
          {result && (
            <a href={result.video_url} target="_blank" rel="noreferrer" className="mt-4 block rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm hover:border-zinc-500">
              動画を開く
            </a>
          )}
        </section>
      </aside>
    </div>
  );
}
