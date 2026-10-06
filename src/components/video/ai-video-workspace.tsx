"use client";

import { useCallback, useEffect, useState } from "react";

type Result = {
  video_url: string;
  request_id: string;
  model: string;
  duration_sec: number;
  aspect_ratio: string;
  sound: boolean;
  prompt?: string;
  bgm?: boolean;
  narration?: boolean;
  sfx?: boolean;
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
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
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
  const [dragActive, setDragActive] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<Result[]>([]);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [activeCancelToken, setActiveCancelToken] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [recoverable, setRecoverable] = useState(false);
  const [providerStatus, setProviderStatus] = useState<"queued" | "processing" | "completed" | "failed">("processing");

  const isSeedance = model === "bytedance/seedance-2.5/text-to-video";
  const isKling = model.startsWith("kling-video/");
  const supportsAspectRatio = !isKling;
  const supportsSound =
    model !== "minimax/h3/image-to-video" &&
    model !== "kling-video/v3.0-turbo/image-to-video";
  const rendering = isGenerating;
  const liveStage = providerStatus === "queued" ? "QUEUED" : providerStatus === "processing" ? "RENDERING" : providerStatus === "completed" ? "COMPLETE" : "FAILED";

  useEffect(() => {
    if (!supportsSound && sound) {
      setSound(false);
      setBgm(false);
      setNarration(false);
      setSfx(false);
      return;
    }
    if (!sound) {
      setBgm(false);
      setNarration(false);
      setSfx(false);
    }
  }, [sound, supportsSound]);

  useEffect(() => {
    if (!video) {
      setVideoPreview(null);
      return;
    }
    const url = URL.createObjectURL(video);
    setVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("zenova-video-history") || "[]");
      if (Array.isArray(saved)) setHistory(saved.slice(0, 6));
    } catch {
      localStorage.removeItem("zenova-video-history");
    }
  }, []);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Date.now() - startedAt);
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [startedAt]);

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

  const pollVideo = useCallback(async (
    requestId: string,
    meta: Pick<Result, "model" | "duration_sec" | "aspect_ratio" | "sound">,
    cancelToken: string
  ): Promise<Result> => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    let transientErrors = 0;

    while (Date.now() < deadline) {
      let res: Response;
      let data: Record<string, unknown> = {};

      try {
        res = await fetch(
          `/api/generate-higgsfield-video/status?request_id=${encodeURIComponent(requestId)}&cancel_token=${encodeURIComponent(cancelToken)}`,
          { credentials: "same-origin", cache: "no-store" }
        );
        data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      } catch {
        transientErrors += 1;
        if (transientErrors >= 8) {
          throw new Error("生成状態の確認に連続して失敗しました。保存したリクエストから再開できます。");
        }
        setStatus("生成状態を再確認しています…");
        await new Promise((resolve) => setTimeout(resolve, Math.min(10000, 2500 * transientErrors)));
        continue;
      }

      if (!res.ok && data.status !== "processing") {
        const retryable = [429, 500, 502, 503, 504].includes(res.status);
        if (!retryable) {
          throw new Error(String(data.error || `ステータス取得失敗 (HTTP ${res.status})`));
        }
        transientErrors += 1;
        if (transientErrors >= 8) {
          throw new Error(String(data.error || "生成状態の確認に連続して失敗しました。保存したリクエストから再開できます。"));
        }
        setStatus("生成状態を再確認しています…");
        await new Promise((resolve) => setTimeout(resolve, Math.min(10000, 2500 * transientErrors)));
        continue;
      }

      transientErrors = 0;
      const current = String(data.status || "processing").toLowerCase();

      if (current === "queued" || current === "processing") {
        setProviderStatus(current);
      } else if (current === "completed") {
        setProviderStatus("completed");
      } else if (current === "failed" || current === "error" || current === "nsfw" || current === "canceled" || current === "cancelled") {
        setProviderStatus("failed");
      }

      if (current === "completed") {
        if (!data.video_url) throw new Error("動画URLが返りませんでした");
        return {
          video_url: String(data.video_url),
          request_id: requestId,
          model: meta.model,
          duration_sec: meta.duration_sec,
          aspect_ratio: meta.aspect_ratio,
          sound: meta.sound,
        };
      }

      if (current === "failed" || current === "error") {
        // Provider has reached a terminal state; the saved job is no longer resumable.
        localStorage.removeItem("zenova-video-active-job");
        throw new Error(String(data.error || "Higgsfieldで動画生成に失敗しました"));
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    try {
      const raw = localStorage.getItem("zenova-video-active-job");
      if (!raw) return;
      const job = JSON.parse(raw) as {
        requestId?: string;
        cancelToken?: string;
        startedAt?: number;
        model?: string;
        duration_sec?: number;
        aspect_ratio?: string;
        sound?: boolean;
      };

      if (
        !job.requestId ||
        !job.cancelToken ||
        !job.model ||
        !job.duration_sec ||
        !job.aspect_ratio
      ) {
        localStorage.removeItem("zenova-video-active-job");
        return;
      }

      setRecovering(true);
      setIsGenerating(true);
      setProviderStatus("processing");
      setStartedAt(Number(job.startedAt) || Date.now());
      setActiveRequestId(job.requestId);
      setActiveCancelToken(job.cancelToken);
      setStatus("前回の生成を復元しています…");

      void pollVideo(
        job.requestId,
        {
          model: job.model,
          duration_sec: Number(job.duration_sec),
          aspect_ratio: job.aspect_ratio,
          sound: Boolean(job.sound),
        },
        job.cancelToken
      )
        .then((completed) => {
          if (cancelled) return;
          setResult(completed);
          setHistory((current) => {
            const next = [
              completed,
              ...current.filter((item) => item.video_url !== completed.video_url),
            ].slice(0, 6);
            localStorage.setItem("zenova-video-history", JSON.stringify(next));
            return next;
          });
          localStorage.removeItem("zenova-video-active-job");
          setRecoverable(false);
          setStatus("前回の生成が完成しました。");
          void fetch("/api/usage", { credentials: "same-origin", cache: "no-store" })
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
        })
        .catch((e) => {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : String(e));
          setRecoverable(Boolean(localStorage.getItem("zenova-video-active-job")));
          setStatus("生成は継続中の可能性があります。request_id を保持しています。");
        })
        .finally(() => {
          if (cancelled) return;
          setRecovering(false);
          setIsGenerating(false);
          setStartedAt(null);
          setActiveRequestId(null);
          setActiveCancelToken(null);
        });
    } catch {
      localStorage.removeItem("zenova-video-active-job");
    }

    return () => {
      cancelled = true;
    };
  }, [pollVideo]);
  
  function resumeActiveRender() {
    const raw = localStorage.getItem("zenova-video-active-job");
    if (!raw) {
      setRecoverable(false);
      setError("再開できる生成リクエストが見つかりません。");
      return;
    }

    try {
      const job = JSON.parse(raw) as {
        requestId?: string;
        cancelToken?: string;
        startedAt?: number;
        model?: string;
        duration_sec?: number;
        aspect_ratio?: string;
        sound?: boolean;
      };
      if (!job.requestId || !job.cancelToken || !job.model || !job.duration_sec || !job.aspect_ratio) {
        throw new Error("保存された生成リクエストが不完全です。");
      }

      setError("");
      setRecoverable(false);
      setRecovering(true);
      setIsGenerating(true);
      setProviderStatus("processing");
      setStartedAt(Number(job.startedAt) || Date.now());
      setActiveRequestId(job.requestId);
      setActiveCancelToken(job.cancelToken);
      setStatus("生成状態を再確認しています…");

      void pollVideo(
        job.requestId,
        {
          model: job.model,
          duration_sec: Number(job.duration_sec),
          aspect_ratio: job.aspect_ratio,
          sound: Boolean(job.sound),
        },
        job.cancelToken
      )
        .then((completed) => {
          setResult(completed);
          setHistory((current) => {
            const next = [completed, ...current.filter((item) => item.video_url !== completed.video_url)].slice(0, 6);
            localStorage.setItem("zenova-video-history", JSON.stringify(next));
            return next;
          });
          localStorage.removeItem("zenova-video-active-job");
          setStatus("完成しました。Refineで次のテイクを作れます。");
          void fetch("/api/usage", { credentials: "same-origin", cache: "no-store" })
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
        })
        .catch((e) => {
          setRecoverable(Boolean(localStorage.getItem("zenova-video-active-job")));
          setError(e instanceof Error ? e.message : String(e));
          setStatus("まだ生成中の可能性があります。必要なら再度状態を確認できます。");
        })
        .finally(() => {
          setRecovering(false);
          setIsGenerating(false);
          setStartedAt(null);
          setActiveRequestId(null);
          setActiveCancelToken(null);
        });
    } catch (e) {
      setRecoverable(false);
      localStorage.removeItem("zenova-video-active-job");
      setError(e instanceof Error ? e.message : String(e));
      setStatus("生成状態を復元できませんでした。");
    }
  }

  async function cancelGeneration() {
    if (!isGenerating || !activeRequestId || !activeCancelToken) return;
    setStatus("生成をキャンセルしています…");
    setError("");

    try {
      const res = await fetch("/api/generate-higgsfield-video/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ request_id: activeRequestId, cancel_token: activeCancelToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `生成キャンセル失敗 (HTTP ${res.status})`);
      }

      setIsGenerating(false);
      setStartedAt(null);
      setActiveRequestId(null);
      setActiveCancelToken(null);
      localStorage.removeItem("zenova-video-active-job");
      setRecoverable(false);
      setStatus("生成をキャンセルしました。条件を調整して、もう一度作れます。");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("キャンセルできませんでした。生成を継続しています。");
    }
  }

  async function generate(nextPrompt?: string) {
    setError("");

    const effectivePrompt = (nextPrompt ?? prompt).trim();

    if (!image && !video && !isSeedance) {
      setError("このモデルでは画像または動画素材を1つ追加してください。動画入力はSeedance 2.5で処理されます。");
      return;
    }
    if (!effectivePrompt) {
      setError("どんな動画にしたいか入力してください。");
      return;
    }
    if (usage && !usage.authenticated) {
      setError("ログインしてください。");
      return;
    }

    setIsGenerating(true);
    setProviderStatus("queued");
    setStartedAt(Date.now());
    setActiveRequestId(null);
    setStatus("素材を準備しています…");

    const form = new FormData();
    if (image) form.set("image", image);
    if (video) form.set("video", video);
    if (audio) form.set("audio", audio);
    form.set("bgm", bgm ? "on" : "off");
    form.set("narration", narration ? "on" : "off");
    form.set("sfx", sfx ? "on" : "off");
    form.set("prompt", effectivePrompt);
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

      const requestId = String(data.request_id);
      const cancelToken = String(data.cancel_token || "");
      if (!cancelToken) throw new Error("キャンセル認証情報が返りませんでした");
      setActiveRequestId(requestId);
      setActiveCancelToken(cancelToken);
      localStorage.setItem(
        "zenova-video-active-job",
        JSON.stringify({
          requestId,
          cancelToken,
          startedAt: Date.now(),
          model: String(data.model || model),
          duration_sec: Number(data.duration_sec || duration),
          aspect_ratio: String(data.aspect_ratio || aspectRatio),
          sound: Boolean(data.sound),
        })
      );
      setStatus("生成を開始しました。Higgsfieldでレンダリング中…");
      const completed = await pollVideo(
        requestId,
        {
          model: String(data.model || model),
          duration_sec: Number(data.duration_sec || duration),
          aspect_ratio: String(data.aspect_ratio || aspectRatio),
          sound: Boolean(data.sound),
        },
        cancelToken
      );

      const completedWithContext: Result = {
        ...completed,
        prompt: effectivePrompt,
        bgm,
        narration,
        sfx,
      };
      setResult(completedWithContext);
      setHistory((current) => {
        const next = [completedWithContext, ...current.filter((item) => item.video_url !== completedWithContext.video_url)].slice(0, 6);
        localStorage.setItem("zenova-video-history", JSON.stringify(next));
        return next;
      });
      localStorage.removeItem("zenova-video-active-job");
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
      const hasActiveJob = Boolean(localStorage.getItem("zenova-video-active-job"));
      setStatus(hasActiveJob ? "生成は継続中の可能性があります。保存したリクエストから再開できます。" : "");
      setRecoverable(hasActiveJob);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsGenerating(false);
      setStartedAt(null);
      setActiveRequestId(null);
      setActiveCancelToken(null);
      setRecovering(false);
    }
  }

  const usagePercent = usage?.video_limit
    ? Math.min(100, (usage.used / usage.video_limit) * 100)
    : 0;

  return (
    <div className="relative overflow-hidden border border-white/10 bg-[#080808] shadow-[0_40px_120px_rgba(0,0,0,0.42)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_34%)]"
      />

      <div className="relative">
        <div className="grid border-b border-white/10 lg:grid-cols-2">
          <section className="border-b border-white/10 p-5 sm:p-7 lg:border-b-0 lg:border-r">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">01 / SOURCE <span className="text-zinc-800">— INPUT</span></p>
                <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em]">Bring your idea in.</h2>
              </div>
              <span className="pt-1 text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                {isSeedance ? "Reference optional" : "Reference required"}
              </span>
            </div>

            <label
              className={[
                "group mt-6 flex min-h-40 cursor-pointer items-center justify-center border border-dashed px-5 text-center transition duration-300",
                dragActive
                  ? "border-white/60 bg-white/[0.07]"
                  : "border-white/10 bg-white/[0.018] hover:border-white/30 hover:bg-white/[0.035]",
              ].join(" ")}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                if (file.type.startsWith("video/")) {
                  setVideo(file);
                  setImage(null);
                  return;
                }
                if (file.type.startsWith("image/")) {
                  setImage(file);
                  setVideo(null);
                  return;
                }
                setError("画像または動画を追加してください。");
              }}
            >
              <div>
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center border border-white/10 text-xl font-light text-zinc-500 transition group-hover:border-white/30 group-hover:text-white">
                  +
                </div>
                <p className="text-sm text-zinc-200">{video ? video.name : image ? image.name : dragActive ? "Drop to load your reference" : "Drop an image, video, or choose a file"}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600">IMAGE · VIDEO</p>
              </div>
              <input
                className="sr-only"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => { const file = e.target.files?.[0] || null; if (!file) return; if (file.type.startsWith("video/")) setVideo(file); else setImage(file); }}
              />
            </label>

            {(image || video) && <button type="button" onClick={() => { setImage(null); setVideo(null); setError(""); }} className="mt-3 text-[9px] uppercase tracking-[0.18em] text-zinc-600 transition hover:text-white">Remove source ×</button>}

            {video && <div className="mt-4 overflow-hidden border border-white/10 bg-black"><video src={videoPreview || undefined} controls muted playsInline className="max-h-72 w-full object-contain" /></div>}

            {preview && (
              <div className="mt-4 overflow-hidden border border-white/10 bg-black">
                <img src={preview} alt="Selected source" className="max-h-72 w-full object-contain" />
              </div>
            )}
          </section>

          <section className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">02 / DIRECTION <span className="text-zinc-800">— INTENT</span></p>
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
              className="mt-6 min-h-40 w-full resize-none border border-white/10 bg-black/70 px-4 py-4 text-sm leading-6 text-white placeholder:text-zinc-700 transition duration-500 focus:border-white/40 focus:bg-black focus:outline-none"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[9px] uppercase tracking-[0.16em] text-zinc-700">
              <span>Natural language direction</span>
              <span className="hidden sm:inline">Camera · Light · Pace · Mood · Story</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Direction starters">
              {[
                ["Cinematic", "cinematic lighting, deliberate camera movement, filmic pacing"],
                ["Editorial", "fashion editorial composition, refined motion, controlled light"],
                ["Product", "premium product film, macro details, precise camera movement"],
                ["Dreamlike", "dreamlike atmosphere, soft light, slow expressive movement"],
              ].map(([label, value]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPrompt((current) => current.trim() ? current : value)}
                  className="border border-white/10 px-2.5 py-2 text-[9px] uppercase tracking-[0.12em] text-zinc-600 transition hover:border-white/30 hover:text-white"
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="border-b border-white/10 p-5 sm:p-7 lg:border-b-0 lg:border-r">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">03 / FRAME <span className="text-zinc-800">— PREVIEW</span></p>
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
                {isGenerating ? (
                  <div className="w-full px-6 py-10 sm:px-10">
                    <div className="relative mx-auto aspect-square w-40 max-w-full">
                      <div className="absolute inset-0 animate-[spin_8s_linear_infinite] rounded-full border border-white/10 border-t-white/60" />
                      <div className="absolute inset-4 animate-[spin_5s_linear_infinite_reverse] rounded-full border border-white/10 border-b-white/35" />
                      <div className="absolute inset-8 flex items-center justify-center rounded-full bg-white/[0.025]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                      </div>
                    </div>
                    <div className="mt-8 border-t border-white/10 pt-4">
                      <div className="flex items-center justify-between gap-4 text-[8px] uppercase tracking-[0.16em]">
                        <span className="text-zinc-600">Provider status</span>
                        <span className="text-white">{liveStage}</span>
                      </div>
                      <div className="mt-3 h-px overflow-hidden bg-white/10">
                        <div className={`h-full transition-all duration-700 ${providerStatus === "queued" ? "w-1/4" : "w-2/3"} bg-white/60`} />
                      </div>
                      <div className="mt-5 flex items-end justify-between gap-4 text-[9px] uppercase tracking-[0.18em]">
                      <div>
                        <p className="text-zinc-300">Rendering take</p>
                        <p className="mt-2 text-zinc-700">Live status from the generation provider</p>
                      </div>
                      <div className="text-right">
                        <p className="tabular-nums text-zinc-500">{Math.floor(elapsed / 1000)}s</p>
                        <button
                          type="button"
                          onClick={() => void cancelGeneration()}
                          className="mt-3 border border-white/15 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-zinc-500 transition hover:border-white/40 hover:text-white"
                        >
                          Cancel render
                        </button>
                      </div>
                    </div>
                  </div>
                  </div>
                ) : result ? (
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
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                  <span>Direct the next take</span>
                  <span>Context preserved</span>
                </div>
                <div className="flex flex-wrap gap-2" aria-label="Quick refinement directions">
                  {["Closer", "Slower", "Darker", "More cinematic"].map((direction) => (
                    <button key={direction} type="button" disabled={rendering} onClick={() => setRefinePrompt(direction)} className="border border-white/10 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-zinc-500 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                      {direction}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input aria-label="Refine the next take" value={refinePrompt} onChange={(e) => setRefinePrompt(e.target.value)} placeholder="Make the next take darker, slower, closer…" className="border border-white/10 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-700 focus:border-white/30 focus:outline-none" />
                  <button type="button" disabled={rendering || !refinePrompt.trim()} onClick={() => { const next = refinePrompt.trim(); if (!next) return; const nextPrompt = `${prompt.trim()}\n\nRefinement: ${next}`; setRefinePrompt(""); setPrompt(nextPrompt); void generate(nextPrompt); }} className="border border-white/20 px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">Refine ↗</button>
                </div>
              </div>
            )}
            {result && (
              <div className="mt-4 grid grid-cols-3 gap-px border border-white/10 bg-white/10 text-[9px] uppercase tracking-[0.14em]">
                <div className="bg-[#070707] px-3 py-2"><span className="text-zinc-600">Model</span><span className="mt-1 block truncate text-zinc-300">{result.model.split("/").slice(-2).join(" / ")}</span></div>
                <div className="bg-[#070707] px-3 py-2"><span className="text-zinc-600">Length</span><span className="mt-1 block text-zinc-300">{result.duration_sec}s</span></div>
                <div className="bg-[#070707] px-3 py-2"><span className="text-zinc-600">Frame</span><span className="mt-1 block text-zinc-300">{result.aspect_ratio}</span></div>
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
            <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">04 / MOTION <span className="text-zinc-800">— PARAMETERS</span></p>
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
                <span>Generated sound</span>
                <input
                  type="checkbox"
                  checked={sound}
                  disabled={!supportsSound}
                  onChange={(e) => setSound(e.target.checked)}
                  className="h-4 w-4 accent-white disabled:opacity-30"
                />
              </label>

              <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4" aria-label="Sound direction">
                <button type="button" disabled={!sound} aria-pressed={bgm} onClick={() => setBgm((value) => !value)} className={`border px-2 py-3 text-[9px] uppercase tracking-[0.12em] transition ${bgm ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-zinc-600"} disabled:cursor-not-allowed disabled:opacity-30`}>
                  BGM
                </button>
                <button type="button" disabled={!sound} aria-pressed={narration} onClick={() => setNarration((value) => !value)} className={`border px-2 py-3 text-[9px] uppercase tracking-[0.12em] transition ${narration ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-zinc-600"} disabled:cursor-not-allowed disabled:opacity-30`}>
                  Narration
                </button>
                <button type="button" disabled={!sound} aria-pressed={sfx} onClick={() => setSfx((value) => !value)} className={`border px-2 py-3 text-[9px] uppercase tracking-[0.12em] transition ${sfx ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-zinc-600"} disabled:cursor-not-allowed disabled:opacity-30`}>
                  SFX
                </button>
              </div>

              <label className="block text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                Audio reference
                <input type="file" accept="audio/*" onChange={(e) => setAudio(e.target.files?.[0] || null)} className="mt-2 block w-full text-xs normal-case tracking-normal text-zinc-400 file:mr-2 file:border file:border-white/10 file:bg-black file:px-2 file:py-2 file:text-zinc-300" />
                {audio && (
                  <div className="mt-2 flex items-center justify-between gap-3 border border-white/10 bg-black px-3 py-2">
                    <span className="min-w-0 truncate normal-case tracking-normal text-zinc-500">{audio.name}</span>
                    <button type="button" onClick={() => setAudio(null)} className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-zinc-600 transition hover:text-white">Remove</button>
                  </div>
                )}
              </label>

              <div className="border-t border-white/10 pt-4 text-[10px] leading-5 text-zinc-600">
                Sound direction is translated into the generation prompt; model audio capabilities vary. Uploaded audio is passed as a reference where supported.
              </div>

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
              <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">05 / RENDER <span className="text-zinc-800">— OUTPUT</span></p>
              <p aria-live="polite" className="mt-1 text-sm text-zinc-400">
                {status || "Everything is ready. Make the move."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void generate()}
              disabled={rendering || recoverable}
              className="border border-white bg-white px-8 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-50"
            >
              {rendering ? (recovering ? "Recovering…" : "Rendering…") : recoverable ? "Resume existing render" : result ? "Create next take" : "Create film"}
            </button>
          </div>

          {history.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4" aria-label="Recent generated takes">
              <div className="mb-3 flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-zinc-600"><span>Recent takes</span><button type="button" onClick={() => { setHistory([]); localStorage.removeItem("zenova-video-history"); }} className="hover:text-white">Clear</button></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {history.map((item) => <button key={item.video_url} type="button" onClick={() => {
  setResult(item);
  if (item.prompt) setPrompt(item.prompt);
  if (typeof item.bgm === "boolean") setBgm(item.bgm);
  if (typeof item.narration === "boolean") setNarration(item.narration);
  if (typeof item.sfx === "boolean") setSfx(item.sfx);
  setDuration(String(item.duration_sec));
  setAspectRatio(item.aspect_ratio);
  setModel(item.model);
  setSound(item.sound);
  setError("");
  setStatus("Take restored. You can direct the next version.");
}} className="group overflow-hidden border border-white/10 bg-black text-left transition hover:border-white/30"><video src={item.video_url} muted playsInline preload="metadata" className="aspect-video w-full object-cover opacity-70 transition group-hover:opacity-100" /><span className="block px-2 py-2 text-[8px] uppercase tracking-[0.14em] text-zinc-600">{item.duration_sec}s · {item.aspect_ratio}</span></button>)}
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="mt-4 border border-red-500/20 bg-red-950/10 p-4 text-sm text-red-300">
              <div>{error}</div>
              {!rendering && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {recoverable && (
                    <button
                      type="button"
                      onClick={resumeActiveRender}
                      className="border border-white/25 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-white transition hover:border-white/60"
                    >
                      Resume render
                    </button>
                  )}
                  {!recoverable && (
                    <button
                      type="button"
                      onClick={() => void generate()}
                      className="border border-red-300/20 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-red-200 transition hover:border-red-300/50"
                    >
                      Start a new take
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
