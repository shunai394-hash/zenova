"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addProfileSample,
  checkTtsHealth,
  createVoiceProfile,
  getGenerationAudioUrl,
  listProfileSamples,
  listVoiceProfiles,
  startGeneration,
  transcribeAudio,
  watchGenerationStatus,
  type VoiceProfile,
} from "@/lib/tts";

const PREFERRED_PROFILE_ID = "3446cc5c-df29-450a-aa85-2df7a772a4d0";

const inputClassName =
  "w-full rounded-xl border border-zinc-700 bg-black px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none";

const labelClassName = "mb-2 block text-sm text-gray-400";

type GenPhase =
  | "idle"
  | "starting"
  | "generating"
  | "completed"
  | "failed"
  | "no_profile"
  | "no_sample";

export function VoiceWorkspace() {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [sampleCount, setSampleCount] = useState<number | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createLanguage, setCreateLanguage] = useState("ja");
  const [createEngine, setCreateEngine] = useState("qwen");
  const [createDescription, setCreateDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [referenceText, setReferenceText] = useState("");
  const [uploadingSample, setUploadingSample] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [sampleMessage, setSampleMessage] = useState<string | null>(null);

  const [text, setText] = useState(
    "こんにちは。ZENOVAの音声テストです。自然な日本語で話します。"
  );
  const [engine, setEngine] = useState("qwen");
  const [modelSize, setModelSize] = useState("1.7B");
  const [language, setLanguage] = useState("ja");
  const [phase, setPhase] = useState<GenPhase>("idle");
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) || null,
    [profiles, selectedProfileId]
  );

  const refreshProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    setListError(null);
    try {
      const ok = await checkTtsHealth();
      setHealthy(ok);
      if (!ok) {
        setProfiles([]);
        setListError(
          "TTS API に接続できません。Voicebox（例: http://127.0.0.1:17493）が起動しているか確認してください。"
        );
        return;
      }

      const list = await listVoiceProfiles();
      setProfiles(list);

      setSelectedProfileId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev;
        if (list.some((p) => p.id === PREFERRED_PROFILE_ID)) {
          return PREFERRED_PROFILE_ID;
        }
        return list[0]?.id ?? "";
      });
    } catch (err) {
      setHealthy(false);
      setProfiles([]);
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  const refreshSamples = useCallback(async (profileId: string) => {
    if (!profileId) {
      setSampleCount(null);
      return;
    }
    try {
      const samples = await listProfileSamples(profileId);
      setSampleCount(samples.length);
    } catch {
      const fromList = profiles.find((p) => p.id === profileId)?.sample_count;
      setSampleCount(typeof fromList === "number" ? fromList : null);
    }
  }, [profiles]);

  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (!selectedProfileId) return;
    const profile = profiles.find((p) => p.id === selectedProfileId);
    if (profile?.default_engine) {
      setEngine(profile.default_engine);
    }
    if (profile?.language) {
      setLanguage(profile.language);
    }
    void refreshSamples(selectedProfileId);
  }, [selectedProfileId, profiles, refreshSamples]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleCreateProfile = async () => {
    setCreateMessage(null);
    const name = createName.trim();
    if (!name) {
      setCreateMessage("Profile名を入力してください。");
      return;
    }
    setCreating(true);
    try {
      const created = await createVoiceProfile({
        name,
        language: createLanguage,
        default_engine: createEngine,
        description: createDescription.trim() || null,
      });
      setCreateMessage(`作成しました: ${created.name}`);
      setCreateName("");
      setCreateDescription("");
      await refreshProfiles();
      setSelectedProfileId(created.id);
    } catch (err) {
      setCreateMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const handleTranscribe = async () => {
    setSampleMessage(null);
    if (!sampleFile) {
      setSampleMessage("音声ファイルを選択してください。");
      return;
    }
    setTranscribing(true);
    try {
      const result = await transcribeAudio({
        file: sampleFile,
        language: "ja",
      });
      setReferenceText(result.text || "");
      setSampleMessage(
        result.text
          ? "文字起こし結果を reference_text に入力しました。"
          : "文字起こし結果が空でした。"
      );
    } catch (err) {
      setSampleMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setTranscribing(false);
    }
  };

  const handleUploadSample = async () => {
    setSampleMessage(null);
    if (!selectedProfileId) {
      setSampleMessage("先に Voice Profile を選択してください。");
      return;
    }
    if (!sampleFile) {
      setSampleMessage("音声ファイルを選択してください。");
      return;
    }
    if (!referenceText.trim()) {
      setSampleMessage("reference_text を入力するか、文字起こししてください。");
      return;
    }

    setUploadingSample(true);
    try {
      await addProfileSample({
        profileId: selectedProfileId,
        file: sampleFile,
        referenceText: referenceText.trim(),
      });
      setSampleMessage("音声サンプルを登録しました。");
      setSampleFile(null);
      await refreshProfiles();
      await refreshSamples(selectedProfileId);
    } catch (err) {
      setSampleMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingSample(false);
    }
  };

  const handleGenerate = async () => {
    setGenError(null);
    setAudioUrl(null);
    setGenerationId(null);
    setStatusLabel(null);
    abortRef.current?.abort();

    if (!selectedProfileId) {
      setPhase("no_profile");
      setGenError("Voice Profile がありません。先に Profile を作成・選択してください。");
      return;
    }

    if (sampleCount === 0 && selectedProfile?.voice_type === "cloned") {
      setPhase("no_sample");
      setGenError(
        "この Profile には音声サンプルがありません。先に WAV/MP3 を登録してください。"
      );
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      setPhase("failed");
      setGenError("生成する日本語テキストを入力してください。");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("starting");
    setStatusLabel("生成を開始しています…");

    try {
      const started = await startGeneration({
        profile_id: selectedProfileId,
        text: trimmed,
        language,
        model_size: modelSize,
        engine,
        normalize: true,
      });

      setGenerationId(started.id);
      setPhase("generating");
      setStatusLabel(`生成中… (${started.status || "generating"})`);

      const finalEvent = await watchGenerationStatus(started.id, {
        signal: controller.signal,
        onUpdate: (event) => {
          setStatusLabel(`生成中… status=${event.status}`);
        },
      });

      const status = finalEvent.status.toLowerCase();
      if (status === "completed") {
        setPhase("completed");
        setStatusLabel("completed");
        setAudioUrl(getGenerationAudioUrl(started.id));
        return;
      }

      setPhase("failed");
      setGenError(
        finalEvent.error ||
          `音声生成に失敗しました (status=${finalEvent.status})`
      );
      setStatusLabel(finalEvent.status);
    } catch (err) {
      if (controller.signal.aborted) return;
      setPhase("failed");
      setGenError(err instanceof Error ? err.message : String(err));
      setStatusLabel(null);
    }
  };

  const handleDownload = async () => {
    if (!audioUrl || !generationId) return;
    try {
      const res = await fetch(audioUrl);
      if (!res.ok) throw new Error(`ダウンロード失敗 (HTTP ${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `zenova-tts-${generationId}.wav`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
    }
  };

  const generating = phase === "starting" || phase === "generating";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Voice Profiles</h2>
            <p className="mt-1 text-sm text-gray-400">
              Qwen TTS（Voicebox）のプロファイルを選択して音声を生成します
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

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <span
            className={`rounded-full px-2.5 py-1 ${
              healthy === null
                ? "bg-zinc-800 text-gray-400"
                : healthy
                  ? "bg-emerald-950 text-emerald-300"
                  : "bg-red-950 text-red-300"
            }`}
          >
            API:{" "}
            {healthy === null
              ? "確認中"
              : healthy
                ? "接続OK"
                : "接続失敗"}
          </span>
          {selectedProfile && (
            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-gray-300">
              samples: {sampleCount ?? selectedProfile.sample_count ?? "?"}
            </span>
          )}
        </div>

        {listError && (
          <p className="mt-4 text-sm text-red-300" role="alert">
            {listError}
          </p>
        )}

        <div className="mt-5">
          <label className={labelClassName} htmlFor="voice-profile">
            Profile 選択
          </label>
          <select
            id="voice-profile"
            className={inputClassName}
            value={selectedProfileId}
            disabled={loadingProfiles || profiles.length === 0}
            onChange={(e) => setSelectedProfileId(e.target.value)}
          >
            {profiles.length === 0 ? (
              <option value="">Profile がありません</option>
            ) : (
              profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.language}
                  {p.default_engine ? ` / ${p.default_engine}` : ""})
                  {typeof p.sample_count === "number"
                    ? ` · samples ${p.sample_count}`
                    : ""}
                </option>
              ))
            )}
          </select>
          {profiles.length === 0 && !loadingProfiles && (
            <p className="mt-2 text-sm text-amber-300">
              Profile がありません。下のフォームから作成してください。
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Profile 作成</h2>
        <p className="mt-1 text-sm text-gray-400">
          名前・言語・エンジン・説明を指定して新しい Voice Profile を作成
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClassName} htmlFor="create-name">
              名前
            </label>
            <input
              id="create-name"
              className={inputClassName}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="例: Qwen Japanese Test"
            />
          </div>
          <div>
            <label className={labelClassName} htmlFor="create-language">
              言語
            </label>
            <select
              id="create-language"
              className={inputClassName}
              value={createLanguage}
              onChange={(e) => setCreateLanguage(e.target.value)}
            >
              <option value="ja">ja</option>
              <option value="en">en</option>
              <option value="zh">zh</option>
              <option value="ko">ko</option>
            </select>
          </div>
          <div>
            <label className={labelClassName} htmlFor="create-engine">
              エンジン
            </label>
            <select
              id="create-engine"
              className={inputClassName}
              value={createEngine}
              onChange={(e) => setCreateEngine(e.target.value)}
            >
              <option value="qwen">qwen</option>
              <option value="kokoro">kokoro</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName} htmlFor="create-description">
              説明
            </label>
            <textarea
              id="create-description"
              className={`${inputClassName} min-h-[80px]`}
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="任意"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleCreateProfile()}
          disabled={creating}
          className="mt-4 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creating ? "作成中…" : "作成"}
        </button>
        {createMessage && (
          <p className="mt-3 text-sm text-gray-300">{createMessage}</p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">音声サンプル登録</h2>
        <p className="mt-1 text-sm text-gray-400">
          WAV/MP3 をアップロードし、reference_text 付きで Profile に登録。文字起こしで自動入力も可能です。
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className={labelClassName} htmlFor="sample-file">
              音声ファイル
            </label>
            <input
              id="sample-file"
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
              className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-black"
              onChange={(e) => {
                setSampleFile(e.target.files?.[0] ?? null);
                setSampleMessage(null);
              }}
            />
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm text-gray-400" htmlFor="reference-text">
                reference_text
              </label>
              <button
                type="button"
                onClick={() => void handleTranscribe()}
                disabled={!sampleFile || transcribing}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-gray-300 hover:border-zinc-500 disabled:opacity-40"
              >
                {transcribing ? "文字起こし中…" : "文字起こし → 自動入力"}
              </button>
            </div>
            <textarea
              id="reference-text"
              className={`${inputClassName} min-h-[100px]`}
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              placeholder="サンプル音声の内容（日本語）"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleUploadSample()}
          disabled={uploadingSample || !selectedProfileId}
          className="mt-4 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploadingSample ? "登録中…" : "サンプルを登録"}
        </button>
        {sampleMessage && (
          <p className="mt-3 text-sm text-gray-300">{sampleMessage}</p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">音声生成</h2>
        <p className="mt-1 text-sm text-gray-400">
          テキスト入力 → Generate → Qwen TTS → Audio Player
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className={labelClassName} htmlFor="tts-text">
              日本語テキスト
            </label>
            <textarea
              id="tts-text"
              className={`${inputClassName} min-h-[140px]`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="読み上げたい日本語テキスト"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClassName} htmlFor="gen-engine">
                engine
              </label>
              <select
                id="gen-engine"
                className={inputClassName}
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
              >
                <option value="qwen">qwen</option>
                <option value="kokoro">kokoro</option>
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="gen-model">
                model_size
              </label>
              <select
                id="gen-model"
                className={inputClassName}
                value={modelSize}
                onChange={(e) => setModelSize(e.target.value)}
              >
                <option value="1.7B">1.7B</option>
                <option value="0.6B">0.6B</option>
                <option value="1B">1B</option>
                <option value="3B">3B</option>
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="gen-lang">
                language
              </label>
              <select
                id="gen-lang"
                className={inputClassName}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="ja">ja</option>
                <option value="en">en</option>
                <option value="zh">zh</option>
                <option value="ko">ko</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating || !healthy}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generating ? "生成中…" : "Generate"}
          </button>
          {phase === "completed" && audioUrl && (
            <button
              type="button"
              onClick={() => void handleDownload()}
              className="rounded-xl border border-zinc-600 px-4 py-2.5 text-sm text-gray-200 hover:border-zinc-400"
            >
              Download
            </button>
          )}
        </div>

        {(statusLabel || generating) && (
          <p className="mt-4 text-sm text-amber-200" aria-live="polite">
            {statusLabel || "音声生成中…"}
            {generationId ? ` · id=${generationId}` : ""}
          </p>
        )}

        {genError && (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {genError}
          </p>
        )}

        {phase === "completed" && audioUrl && (
          <div className="mt-6 rounded-xl border border-zinc-700 bg-black/40 p-4">
            <p className="mb-3 text-sm text-gray-400">Audio Player</p>
            <audio
              key={audioUrl}
              controls
              src={audioUrl}
              className="w-full"
              preload="metadata"
            >
              お使いのブラウザは audio 要素に対応していません。
            </audio>
          </div>
        )}
      </section>
    </div>
  );
}
