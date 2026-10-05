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
  const [video, setVideo] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("5");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [sound, setSound] = useState(true);
  const [bgm, setBgm] = useState(true);
  const [narration, setNarration] = useState(false);
  const [sfx, setSfx] = useState(true);
  const [model, setModel] = useState("bytedance/seedance-2.5/text-to-video");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const isSeedance = model === "bytedance/seedance-2.5/text-to-video";
  const isKling = model.startsWith("kling-video/");
  const supportsAspectRatio = !isKling;
  const supportsSound =
    model !== "minimax/h3/image-to-video" &&
    model !== "kling-video/v3.0-turbo/image-to-video";
  const rendering = isGenerating;

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
      .then((d) =>
        setUsage({
          authenticated: d.authenticated === true,
          remaining: Number(d.remaining ?? 0),
          used: Number(d.used ?? 0),
          video_limit: Number(d.video_limit ?? 0),
          plan: String(d.plan ?? "free"),
        })
      )
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

    if (!image && !video && !isSeedance) {
      setError("このモデルでは画像または動画素材を1つ追加してください。動画入力はSeedance 2.5で処理されます。");
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

    setIsGenerating(true);
    setStatus("素材を準備しています…");

    const form = new FormData();
    if (image) form.set("image", image);
    if (video) form.set("video", video);
    if (audio) form.set("audio", audio);
    form.set("bgm", bgm ? "on" : "off");
    form.set("narration", narration ? "on" : "off");
    form.set("sfx", sfx ? "on" : "off");
    const audioDirections = [
      bgm ? "cinematic background music" : "",
      narration ? "clear spoken narration" : "",
      sfx ? "purposeful sound effects" : "",
    ].filter(Boolean).join(", ");
    const directedPrompt = audioDirections
      ? `${prompt.trim()}\n\nAudio direction: ${audioDirections}.`
      : prompt.trim();
    form.set("prompt", directedPrompt);
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
      setStatus("完成しました。Refineで次のテイクを作れます。");
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
    } finally {
      setIsGenerating(false);
    }
  }

  const usagePercent = usage?.video_limit
    ? Math.min(100, (usage.used / usage.video_limit) * 100)
    : 0;

  return (
    <div className="relative overflow-hidden border border-white/10 bg-[#080808] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_34%)]"
      />

      <div className="relative">
        <div className="grid border-b border-white/10 lg:grid-cols-2">
          <section className="border-b border-white/10 p-5 sm:p-7 lg:border-b-0 lg:border-r">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">01 / SOURCE</p>
                <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em]">Bring your idea in.</h2>
              </div>
              <span className="pt-1 text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                {isSeedance ? "Reference optional" : "Reference required"}
              </span>
            </div>

            <label className="group mt-6 flex min-h-40 cursor-pointer items-center justify-center border border-dashed border-white/10 bg-white/[0.018] px-5 text-center transition duration-300 hover:border-white/30 hover:bg-white/[0.035]">
              <div>
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center border border-white/10 text-xl font-light text-zinc-500 transition group-hover:border-white/30 group-hover:text-white">
                  +
                </div>
                <p className="text-sm text-zinc-200">{image ? image.name : "Drop an image, video, or choose a file"}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600">IMAGE · VIDEO</p>
              </div>
              <input
                className="sr-only"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => { const file = e.target.files?.[0] || null; if (!file) return; if (file.type.startsWith("video/")) setVideo(file); else setImage(file); }}
              />
            </label>

            {video && <div className="mt-4 overflow-hidden border border-white/10 bg-black"><video src={URL.createObjectURL(video)} controls muted playsInline className="max-h-72 w-full object-contain" /></div>}

            {preview && (
              <div className="mt-4 overflow-hidden border border-white/10 bg-black">
                <img src={preview} alt="Selected source" className="max-h-72 w-full object-contain" />
              </div>
            )}
          </section>

          <section className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">02 / DIRECTION</p>
                <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em]">Tell it what to feel.</h2>
              </div>
              <span className="pt-1 text-[9px] uppercase tracking-[0.18em] text-zinc-600">{prompt.length}/5000</span>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={8}
              maxLength={5000}
              placeholder="Describe the scene, story, camera, light, pacing, character, atmosphere — anything you want to see."
              className="mt-6 min-h-40 w-full resize-none border border-white/10 bg-black/60 px-4 py-4 text-sm leading-6 text-white placeholder:text-zinc-700 transition focus:border-white/35 focus:outline-none"
            />

            <div className="mt-3 flex items-center justify-between gap-4 text-[9px] uppercase tracking-[0.16em] text-zinc-700">
              <span>Natural language direction</span>
              <span className="hidden sm:inline">Camera · Light · Pace · Mood · Story</span>
            </div>
          </section>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="border-b border-white/10 p-5 sm:p-7 lg:border-b-0 lg:border-r">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">03 / FRAME</p>
                <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em]">Direct the frame.</h2>
              </div>
              <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-700">Live output</span>
            </div>

            <div className="mt-6 flex min-h-[420px] items-center justify-center border border-white/10 bg-black p-4">
              <div
                className={`relative flex max-h-[560px] w-full items-center justify-center overflow-hidden bg-[#050505] ${
                  aspectRatio === "9:16"
                    ? "aspect-[9/16] max-w-[300px]"
                    : aspectRatio === "1:1"
                      ? "aspect-square max-w-[520px]"
                      : "aspect-video max-w-[760px]"
                }`}
              >
                {result ? (
                  <video src={result.video_url} controls playsInline className="h-full w-full object-contain" />
                ) : preview ? (
                  <>
                    <img src={preview} alt="" className="h-full w-full object-contain opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_0,rgba(0,0,0,0.28)_70%)]" />
                    <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/70 px-4 py-3 backdrop-blur">
                      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-zinc-500">
                        <span>Reference frame</span>
                        <span>{aspectRatio}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="px-8 text-center">
                    <div className="mx-auto h-px w-12 bg-white/20" />
                    <p className="mt-5 text-[10px] uppercase tracking-[0.24em] text-zinc-700">Your frame appears here</p>
                  </div>
                )}
              </div>
            </div>

            {result && (
              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input value={refinePrompt} onChange={(e) => setRefinePrompt(e.target.value)} placeholder="Make the next take darker, slower, closer…" className="border border-white/10 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-700 focus:border-white/30 focus:outline-none" />
                <button type="button" disabled={rendering || !refinePrompt.trim()} onClick={() => { const next = refinePrompt.trim(); setRefinePrompt(""); setPrompt((current) => `${current}\n\nRefinement: ${next}`); window.setTimeout(() => void generate(), 0); }} className="border border-white/20 px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">Refine ↗</button>
              </div>
            )}

            {result && (
              <a
                href={result.video_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block border border-white/10 px-4 py-3 text-center text-[10px] uppercase tracking-[0.18em] text-zinc-400 transition hover:border-white/30 hover:text-white"
              >
                Open finished film ↗
              </a>
            )}
          </section>

          <aside className="p-5 sm:p-7">
            <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">04 / MOTION</p>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em]">Set the language.</h2>

            <div className="mt-6 space-y-5">
              <label className="block text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                Model
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm normal-case tracking-normal text-white focus:border-white/30 focus:outline-none"
                >
                  <option value="bytedance/seedance-2.5/text-to-video">Seedance 2.5 / Text</option>
                  <option value="alibaba/wan-3.0-prime/image-to-video">Wan 3.0 Prime</option>
                  <option value="kling-video/v3.0/pro/image-to-video">Kling 3.0 Pro</option>
                  <option value="kling-video/v3.0-turbo/image-to-video">Kling 3.0 Turbo</option>
                  <option value="minimax/h3/image-to-video">MiniMax H3</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                  Duration
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm normal-case tracking-normal text-white focus:border-white/30 focus:outline-none"
                  >
                    <option value="5">05 sec</option>
                    <option value="10">10 sec</option>
                    <option value="15">15 sec</option>
                  </select>
                </label>

                <label className="block text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                  Frame
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    disabled={!supportsAspectRatio}
                    className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm normal-case tracking-normal text-white disabled:opacity-30"
                  >
                    <option value="9:16">9:16</option>
                    <option value="16:9">16:9</option>
                    <option value="1:1">1:1</option>
                  </select>
                </label>
              </div>

              <label className="flex cursor-pointer items-center justify-between border-t border-white/10 pt-4 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                <span>Generated audio</span>
                <input
                  type="checkbox"
                  checked={sound}
                  disabled={!supportsSound}
                  onChange={(e) => setSound(e.target.checked)}
                  className="h-4 w-4 accent-white disabled:opacity-30"
                />
              </label>

              <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                <button type="button" onClick={() => setBgm((value) => !value)} className={`border px-2 py-3 text-[9px] uppercase tracking-[0.12em] transition ${bgm ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-zinc-600"}`}>
                  BGM
                </button>
                <button type="button" onClick={() => setNarration((value) => !value)} className={`border px-2 py-3 text-[9px] uppercase tracking-[0.12em] transition ${narration ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-zinc-600"}`}>
                  Narration
                </button>
                <button type="button" onClick={() => setSfx((value) => !value)} className={`border px-2 py-3 text-[9px] uppercase tracking-[0.12em] transition ${sfx ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-zinc-600"}`}>
                  SFX
                </button>
              </div>

              <label className="block text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                Audio reference
                <input type="file" accept="audio/*" onChange={(e) => setAudio(e.target.files?.[0] || null)} className="mt-2 block w-full text-xs normal-case tracking-normal text-zinc-400 file:mr-2 file:border file:border-white/10 file:bg-black file:px-2 file:py-2 file:text-zinc-300" />
              </label>

              <div className="border-t border-white/10 pt-4 text-[10px] leading-5 text-zinc-600">
                {isSeedance
                  ? "Text-led direction. Add a reference image when composition matters."
                  : isKling
                    ? "Kling follows the source frame ratio."
                    : "Image-led direction. Motion is composed around the source."}
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                <span>Usage</span>
                <span>{usage?.authenticated ? `${usage.remaining} remaining` : "Sign in required"}</span>
              </div>
              <div className="mt-2 h-px bg-white/10">
                <div className="h-px bg-white/50 transition-all" style={{ width: `${usagePercent}%` }} />
              </div>
            </div>
          </aside>
        </div>

        <div className="border-t border-white/10 bg-[#050505] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">05 / RENDER</p>
              <p className="mt-1 text-sm text-zinc-400">
                {status || "Everything is ready. Make the move."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void generate()}
              disabled={rendering}
              className="border border-white bg-white px-8 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-50"
            >
              {rendering ? "Rendering" : "Create film"}
            </button>
          </div>

          {error && (
            <div className="mt-4 border border-red-500/20 bg-red-950/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
