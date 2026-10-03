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

export function AiVideoWorkspace() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("5");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [sound, setSound] = useState(true);
  const [model, setModel] = useState("kling-video/v3.0/pro/image-to-video");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    if (!image) { setPreview(null); return; }
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

  async function generate() {
    setError("");
    setResult(null);
    if (!image) return setError("商品・人物・素材などの画像を1枚選択してください。");
    if (!prompt.trim()) return setError("どんな動画にしたいか入力してください。");
    if (usage && !usage.authenticated) return setError("ログインしてください。");

    setStatus("画像をアップロードしています…");
    const form = new FormData();
    form.set("image", image);
    form.set("prompt", prompt.trim());
    form.set("duration", duration);
    form.set("aspect_ratio", aspectRatio);
    form.set("sound", sound ? "on" : "off");
    form.set("model", model);

    try {
      setStatus("Higgsfieldで動画を生成しています…");
      const res = await fetch("/api/generate-higgsfield-video", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `生成失敗 (HTTP ${res.status})`);
      setResult(data);
      setStatus("完成しました。");
      setUsage((prev) => prev ? { ...prev, used: prev.used + 1, remaining: Math.max(0, prev.remaining - 1) } : prev);
    } catch (e) {
      setStatus("");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">素材</h2>
          <p className="mt-1 text-sm text-zinc-400">画像1枚からAIが動画を作ります。商品画像だけでなく、人物・風景・作品にも使えます。</p>
          <input
            className="mt-4 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-white"
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
          {preview && <img src={preview} alt="" className="mt-4 max-h-72 rounded-xl object-contain" />}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">何を作る？</h2>
          <p className="mt-1 text-sm text-zinc-400">普通の文章で指示してください。CMに限定せず、SNS動画・紹介動画・映像作品などに使えます。</p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={7}
            placeholder="例：この商品の高級感が伝わる短編動画。最初はゆっくり寄り、途中で商品を回り込むカメラ、最後は明るい背景で印象的に見せて。"
            className="mt-4 w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">オプション</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-sm text-zinc-400">長さ
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white">
                <option value="5">5秒</option><option value="10">10秒</option><option value="15">15秒</option>
              </select>
            </label>
            <label className="text-sm text-zinc-400">画面比率
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white">
                <option value="9:16">9:16 縦</option><option value="16:9">16:9 横</option><option value="1:1">1:1 正方形</option>
              </select>
            </label>
            <label className="text-sm text-zinc-400">モデル
              <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white">
                <option value="kling-video/v3.0/pro/image-to-video">Kling 3.0 Pro</option>
                <option value="kling-video/v3.0-turbo/image-to-video">Kling 3.0 Turbo</option>
                <option value="pixverse/v6/image-to-video">PixVerse V6</option>
                <option value="bytedance/seedance-2.5/image-to-video">Seedance 2.5</option>
              </select>
            </label>
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm text-zinc-300">
            <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
            AI音声・サウンドを生成
          </label>
        </section>

        {usage?.authenticated && (
          <p className="text-xs text-zinc-500">利用状況：残り {usage.remaining} 本 / 使用 {usage.used} 本</p>
        )}

        {error && <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}

        <button
          type="button"
          onClick={() => void generate()}
          disabled={Boolean(status)}
          className="w-full rounded-2xl bg-white px-5 py-4 text-base font-semibold text-black disabled:cursor-wait disabled:opacity-50"
        >
          {status || "AI動画を生成する"}
        </button>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold">完成動画</h2>
          <div className={`mx-auto mt-4 flex min-h-[360px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-zinc-700 bg-black ${aspectRatio === "9:16" ? "aspect-[9/16] max-w-[260px]" : "aspect-video w-full"}`}>
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
