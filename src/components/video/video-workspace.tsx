"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  checkTtsHealth,
  getGenerationAudioUrl,
  listVoiceProfiles,
  startGeneration,
  watchGenerationStatus,
  type VoiceProfile,
} from "@/lib/tts";

const PREFERRED_PROFILE_ID = "3446cc5c-df29-450a-aa85-2df7a772a4d0";
const PREFERRED_PROFILE_NAME = /qwen\s*japanese\s*test/i;
const SAMPLE_IMAGE_URL = "/samples/workspace-vertical.jpg";

function pickPreferredProfileId(
  list: VoiceProfile[],
  previous: string
): string {
  if (previous && list.some((p) => p.id === previous)) return previous;
  const byId = list.find((p) => p.id === PREFERRED_PROFILE_ID);
  if (byId) return byId.id;
  const byName = list.find((p) => PREFERRED_PROFILE_NAME.test(p.name));
  if (byName) return byName.id;
  const japanese = list.find(
    (p) => p.language === "ja" || /japanese|日本語/i.test(p.name)
  );
  return japanese?.id ?? list[0]?.id ?? "";
}

const inputClassName =
  "w-full rounded-xl border border-zinc-700 bg-black px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none";

const labelClassName = "mb-2 block text-sm text-gray-400";

type VoicePhase = "idle" | "starting" | "generating" | "completed" | "failed";
type VideoPhase = "idle" | "rendering" | "completed" | "failed";

type WorkspaceResult = {
  final_video_url: string;
  audio_url: string;
  filename: string;
  bytes: number;
  duration_sec: number;
  provider: string;
  visual_source: string;
  captions_burned: boolean;
};

type UsageView = {
  authenticated: boolean;
  remaining: number;
  used: number;
  video_limit: number;
  video_test_allowance: boolean;
  plan: string;
};

export function VideoWorkspace() {
  const [script, setScript] = useState(
    "こんにちは。ZENOVAのショート動画です。今日のポイントを、わかりやすく紹介します。"
  );

  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [engine, setEngine] = useState("qwen");
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [captionsOn, setCaptionsOn] = useState(true);

  const [videoPhase, setVideoPhase] = useState<VideoPhase>("idle");
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [result, setResult] = useState<WorkspaceResult | null>(null);
  const [usage, setUsage] = useState<UsageView | null>(null);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) || null,
    [profiles, selectedProfileId]
  );

  const refreshProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    setListError(null);
    try {
      // health は表示用。失敗しても profiles は取りにいく（/voice と同じ /api/tts を使用）
      const listPromise = listVoiceProfiles();
      const healthPromise = checkTtsHealth();

      const list = await listPromise;
      setProfiles(list);
      if (list.length > 0) {
        setSelectedProfileId((prev) => pickPreferredProfileId(list, prev));
      }

      const ok = await healthPromise;
      setHealthy(ok);

      if (list.length === 0) {
        setListError(
          ok
            ? "Voice Profile がありません。/voice で Profile を作成してください。"
            : "TTS API に接続できません。Voicebox（例: http://127.0.0.1:17493）が起動しているか確認してください。"
        );
      }
    } catch (err) {
      setHealthy(false);
      setProfiles([]);
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/usage", { credentials: "same-origin" });
        const data = (await res.json()) as Record<string, unknown>;
        if (cancelled) return;
        setUsage({
          authenticated: data.authenticated === true,
          remaining: Number(data.remaining ?? 0),
          used: Number(data.used ?? 0),
          video_limit: Number(data.video_limit ?? 0),
          video_test_allowance: data.video_test_allowance === true,
          plan: String(data.plan ?? "free"),
        });
      } catch {
        if (!cancelled) setUsage(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleGenerateVoice = async () => {
    setVoiceError(null);
    setAudioUrl(null);
    setGenerationId(null);
    setAudioDurationSec(null);
    abortRef.current?.abort();

    const trimmed = script.trim();
    if (!trimmed) {
      setVoicePhase("failed");
      setVoiceError("台本を入力してください。");
      return;
    }
    if (!selectedProfileId) {
      setVoicePhase("failed");
      setVoiceError("Voice Profile を選択してください。");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setVoicePhase("starting");
    setVoiceStatus("Qwen TTS を開始しています…");

    try {
      const started = await startGeneration({
        profile_id: selectedProfileId,
        text: trimmed,
        language: selectedProfile?.language || "ja",
        model_size: "1.7B",
        engine,
        normalize: true,
      });

      setGenerationId(started.id);
      setVoicePhase("generating");
      setVoiceStatus(`生成中… (${started.status || "generating"})`);

      const finalEvent = await watchGenerationStatus(started.id, {
        signal: controller.signal,
        onUpdate: (event) => {
          setVoiceStatus(`生成中… status=${event.status}`);
        },
      });

      const status = finalEvent.status.toLowerCase();
      if (status === "completed") {
        setVoicePhase("completed");
        setVoiceStatus("completed");
        setAudioUrl(getGenerationAudioUrl(started.id));
        if (typeof finalEvent.duration === "number" && finalEvent.duration > 0) {
          setAudioDurationSec(finalEvent.duration);
        }
        return;
      }

      setVoicePhase("failed");
      setVoiceError(
        finalEvent.error || `音声生成に失敗しました (status=${finalEvent.status})`
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      setVoicePhase("failed");
      setVoiceError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleGenerateVideo = async () => {
    setVideoError(null);
    setResult(null);

    if (!script.trim()) {
      setVideoPhase("failed");
      setVideoError("台本を入力してください。");
      return;
    }
    if (!generationId || !audioUrl) {
      setVideoPhase("failed");
      setVideoError("先に Qwen 音声を生成してください。");
      return;
    }
    if (!imageFile && !videoFile) {
      setVideoPhase("failed");
      setVideoError("動画素材または画像素材を選択してください。");
      return;
    }

    setVideoPhase("rendering");
    setVideoStatus("9:16 MP4 を生成しています…");

    try {
      const form = new FormData();
      form.set("script", script.trim());
      form.set("captions_on", captionsOn ? "1" : "0");
      form.set("tts_generation_id", generationId);
      if (audioDurationSec) {
        form.set("audio_duration_sec", String(audioDurationSec));
      }
      form.set("motion", "gentle cinematic push-in, vertical 9:16, natural light");

      const audioRes = await fetch(audioUrl);
      if (audioRes.ok) {
        const audioBlob = await audioRes.blob();
        const ext = audioBlob.type.includes("mpeg") ? "mp3" : "wav";
        form.set("audio", audioBlob, `tts-${generationId}.${ext}`);
      }

      if (imageFile) form.set("image", imageFile);
      if (videoFile) form.set("video", videoFile);

      const res = await fetch("/api/create-workspace-video", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as WorkspaceResult & {
        error?: string;
        login_url?: string;
      };

      if (res.status === 401) {
        throw new Error("ログインが必要です。ヘッダーからログインすると /video に戻ります。");
      }
      if (!res.ok || !data.final_video_url) {
        throw new Error(data.error || `動画生成に失敗しました (HTTP ${res.status})`);
      }

      setResult(data);
      setVideoPhase("completed");
      setVideoStatus("completed");
    } catch (err) {
      setVideoPhase("failed");
      setVideoError(err instanceof Error ? err.message : String(err));
      setVideoStatus(null);
    }
  };

  const handleUseSampleImage = async () => {
    try {
      const res = await fetch(SAMPLE_IMAGE_URL);
      if (!res.ok) {
        throw new Error("サンプル画像が見つかりません");
      }
      const blob = await res.blob();
      const file = new File([blob], "workspace-vertical.jpg", {
        type: blob.type || "image/jpeg",
      });
      setImageFile(file);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDownloadMp4 = async () => {
    if (!result?.final_video_url) return;
    try {
      const res = await fetch(result.final_video_url);
      if (!res.ok) {
        throw new Error(`ダウンロード失敗 (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = result.filename || "zenova-9x16.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : String(err));
    }
  };

  const voiceBusy = voicePhase === "starting" || voicePhase === "generating";
  const videoBusy = videoPhase === "rendering";
  const canGenerateVideo = Boolean(usage?.authenticated && (usage.remaining ?? 0) > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        {usage && !usage.authenticated && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">
            Video Workspace の動画生成にはログインが必要です。
            <a
              href="/login?next=/video"
              className="ml-2 underline hover:text-white"
            >
              ログインして /video に戻る
            </a>
          </section>
        )}
        {usage?.authenticated && usage.video_test_allowance && (
          <section className="rounded-2xl border border-emerald-500/35 bg-emerald-950/25 p-4 text-sm text-emerald-100">
            テスト枠（本日 {usage.video_limit} 本）· 残り {usage.remaining} 本 / 使用 {usage.used} 本
          </section>
        )}
        {usage?.authenticated &&
          !usage.video_test_allowance &&
          usage.plan === "free" && (
            <section className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-gray-300">
              Free プランでは動画生成できません。
              <a href="/pricing" className="ml-2 underline hover:text-white">
                料金プラン
              </a>
            </section>
          )}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">台本</h2>
          <p className="mt-1 text-sm text-gray-400">
            日本語ナレーションの原稿です。このテキストから音声と字幕を作ります。
          </p>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={7}
            className={`${inputClassName} mt-4 resize-y`}
            placeholder="ショート動画の台本を入力"
          />
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Voice</h2>
              <p className="mt-1 text-sm text-gray-400">
                既存の Voicebox / Qwen TTS を使います（Voice 機能はそのまま）
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshProfiles()}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-gray-300 hover:border-zinc-500"
            >
              再読み込み
            </button>
          </div>

          {healthy === false && (
            <p className="mt-3 text-sm text-amber-400">
              Voicebox 未接続。Voice ページと同じ TTS API を利用します。
            </p>
          )}
          {listError && (
            <p className="mt-3 text-sm text-red-400">{listError}</p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="workspace-voice">
                Voice 選択
              </label>
              <select
                id="workspace-voice"
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                disabled={loadingProfiles || profiles.length === 0}
                className={inputClassName}
              >
                {loadingProfiles && (
                  <option value="">読み込み中…</option>
                )}
                {!loadingProfiles && profiles.length === 0 && (
                  <option value="">Profile がありません</option>
                )}
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                    {profile.language ? ` (${profile.language})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="workspace-engine">
                エンジン
              </label>
              <select
                id="workspace-engine"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                className={inputClassName}
              >
                <option value="qwen">qwen</option>
                <option value="qwen_custom_voice">qwen_custom_voice</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleGenerateVoice()}
              disabled={voiceBusy}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {voiceBusy ? "音声生成中…" : "音声生成"}
            </button>
            {voiceStatus && (
              <span className="text-xs text-gray-400">{voiceStatus}</span>
            )}
          </div>
          {voiceError && (
            <p className="mt-3 text-sm text-red-400">{voiceError}</p>
          )}
          {audioUrl && (
            <audio className="mt-4 w-full" controls src={audioUrl} />
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">動画素材 / 画像素材</h2>
          <p className="mt-1 text-sm text-gray-400">
            動画ファイルがあればそれを使います。画像のみの場合は接続済みの
            Kling / Luma でモーション生成し、失敗時は静止画の 9:16 クリップにします。
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="workspace-image">
                画像素材
              </label>
              <input
                id="workspace-image"
                type="file"
                accept="image/*"
                className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-white"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => void handleUseSampleImage()}
                className="mt-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-gray-300 hover:border-zinc-500"
              >
                サンプル画像を使う
              </button>
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="選択した画像"
                  className="mt-3 h-32 w-full rounded-xl object-cover"
                />
              )}
            </div>
            <div>
              <label className={labelClassName} htmlFor="workspace-video">
                動画素材
              </label>
              <input
                id="workspace-video"
                type="file"
                accept="video/mp4,video/webm,video/*"
                className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-white"
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              />
              {videoFile && (
                <p className="mt-3 text-xs text-gray-400">{videoFile.name}</p>
              )}
            </div>
          </div>

          <label className="mt-5 flex items-center gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={captionsOn}
              onChange={(e) => setCaptionsOn(e.target.checked)}
              className="h-4 w-4 accent-white"
            />
            字幕 ON
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleGenerateVideo()}
              disabled={videoBusy || !canGenerateVideo}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {videoBusy ? "動画生成中…" : "動画生成"}
            </button>
            {videoStatus && (
              <span className="text-xs text-gray-400">{videoStatus}</span>
            )}
          </div>
          {videoError && (
            <p className="mt-3 text-sm text-red-400">{videoError}</p>
          )}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold text-gray-200">9:16 プレビュー</h2>
          <div className="mx-auto mt-4 aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-[1.6rem] border border-zinc-700 bg-black">
            {result?.final_video_url ? (
              <video
                key={result.final_video_url}
                className="h-full w-full object-cover"
                controls
                playsInline
                src={result.final_video_url}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-500">
                生成後にここに 9:16 MP4 が表示されます
              </div>
            )}
          </div>

          {result && (
            <div className="mt-4 space-y-2 text-xs text-gray-400">
              <p>provider: {result.provider}</p>
              <p>source: {result.visual_source}</p>
              <p>captions: {result.captions_burned ? "burned" : "off"}</p>
              <p>
                {result.duration_sec.toFixed(1)}s ·{" "}
                {Math.round(result.bytes / 1024)} KB
              </p>
              <a
                href={result.final_video_url}
                download={result.filename}
                onClick={(event) => {
                  event.preventDefault();
                  void handleDownloadMp4();
                }}
                className="inline-flex rounded-lg border border-zinc-600 px-3 py-2 text-sm text-white hover:border-zinc-400"
              >
                MP4 をダウンロード
              </a>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
