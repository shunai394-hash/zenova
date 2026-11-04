"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";

type Job = { taskId: string; state: number; progress: number; videos: string[]; error?: string | null };
const initialScript = `深夜2時。主人公のスマートフォンに、知らない番号から一通のメッセージが届く。
「今、駅のホームにいるよ」
主人公は返信しない。ところが次の瞬間、窓の外に誰かの影が立っていることに気づく。`;

export function DramaStudio() {
  const [title, setTitle] = useState("午前2時のメッセージ");
  const [genre, setGenre] = useState("恋愛・ミステリー");
  const [script, setScript] = useState(initialScript);
  const [keywords, setKeywords] = useState("深夜の寝室, 光るスマートフォン, 雨の駅, 無人のホーム, 窓の外の人影");
  const [clipDuration, setClipDuration] = useState("5");
  const [captions, setCaptions] = useState(true);
  const [materials, setMaterials] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"checking" | "ready" | "missing" | "error">("checking");
  const [statusMessage, setStatusMessage] = useState("制作エンジンの接続を確認しています");
  const [job, setJob] = useState<Job | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const scriptLength = useMemo(() => script.trim().length, [script]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/drama/status", { cache: "no-store" })
      .then(async (response) => response.json())
      .then((data) => {
        if (cancelled) return;
        setStatus(data.ready ? "ready" : "missing");
        setStatusMessage(data.message || "動画生成エンジンの設定を確認してください");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        setStatusMessage("接続状態を確認できません");
      });
    return () => { cancelled = true; };
  }, []);

  async function checkConnection() {
    setStatus("checking");
    setStatusMessage("MoneyPrinterTurboへの接続を確認中");
    try {
      const response = await fetch("/api/drama/status", { cache: "no-store" });
      const data = await response.json();
      setStatus(data.ready ? "ready" : "missing");
      setStatusMessage(data.message || "動画生成エンジンの設定を確認してください");
    } catch {
      setStatus("error");
      setStatusMessage("接続状態を確認できません");
    }
  }

  async function uploadMaterials(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    const added: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/drama/materials", { method: "POST", body: form });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `${file.name} のアップロードに失敗しました`);
        added.push(String(data.file));
      }
      setMaterials((current) => [...current, ...added]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  async function generate() {
    setError("");
    setJob(null);
    setWorking(true);
    try {
      const response = await fetch("/api/drama/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, genre, script, keywords, clip_duration_sec: Number(clipDuration), captions_on: captions, materials }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "動画生成を開始できませんでした");
      const taskId = String(data.task_id);
      await poll(taskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setWorking(false);
    }
  }

  async function poll(taskId: string) {
    for (let attempt = 0; attempt < 180; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const response = await fetch(`/api/drama/tasks/${encodeURIComponent(taskId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "タスク状態を取得できません");
      const current: Job = { taskId, state: Number(data.state ?? 0), progress: Number(data.progress ?? 0), videos: Array.isArray(data.videos) ? data.videos : [], error: data.error ?? null };
      setJob(current);
      if (current.state === -1 || current.error) throw new Error(current.error || "動画生成に失敗しました");
      if (current.state === 1 || current.progress >= 100 || current.videos.length > 0) {
        setWorking(false);
        return;
      }
    }
    throw new Error("生成に時間がかかっています。タスクIDを保持したまま、後で状態を再確認してください。");
  }

  const statusTone = status === "ready" ? "text-emerald-300" : status === "missing" || status === "error" ? "text-amber-300" : "text-zinc-400";

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="fixed inset-0 pointer-events-none opacity-40" aria-hidden="true">
        <div className="absolute -top-40 right-0 h-[520px] w-[520px] rounded-full bg-violet-700/10 blur-[130px]" />
        <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-cyan-700/10 blur-[130px]" />
      </div>
      <div className="relative">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-violet-300">ZENOVA / DRAMA STUDIO</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Short Drama Studio</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">脚本からシーン設計、ナレーション、字幕、縦型動画まで。ショートドラマ制作を一つの画面に集約します。</p>
            </div>
            <div className="min-w-64 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Render engine</span>
                <span className={`text-xs ${statusTone}`}>{status === "ready" ? "CONNECTED" : status === "checking" ? "CHECKING" : "NOT READY"}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-400">{statusMessage}</p>
              <button onClick={checkConnection} className="mt-3 text-xs text-white underline decoration-white/30 underline-offset-4">接続を再確認</button>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 sm:p-7">
                <div className="mb-5"><p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">01 / Story setup</p><h2 className="mt-2 text-xl font-semibold">ドラマの基本設定</h2></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs text-zinc-400">作品タイトル<input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-violet-400" /></label>
                  <label className="block text-xs text-zinc-400">ジャンル<select value={genre} onChange={(e) => setGenre(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-violet-400"><option>恋愛・ミステリー</option><option>恋愛・男女のすれ違い</option><option>スカッと・逆転</option><option>感動・家族</option><option>人情・人生</option><option>職場・人間関係</option><option>ホラー・サスペンス</option></select></label>
                </div>
                <label className="mt-4 block text-xs text-zinc-400">シナリオ<textarea value={script} onChange={(e) => setScript(e.target.value)} rows={8} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black px-4 py-3 text-sm leading-7 text-zinc-100 outline-none focus:border-violet-400" placeholder="ナレーションと映像の流れが分かるシナリオを入力" /></label>
                <div className="mt-2 flex justify-between text-[11px] text-zinc-600"><span>シナリオは入力内容をそのまま制作エンジンへ渡します。</span><span>{scriptLength.toLocaleString()} chars</span></div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 sm:p-7">
                <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">02 / Visual direction</p><h2 className="mt-2 text-xl font-semibold">映像素材・編集設定</h2>
                <label className="mt-5 block text-xs text-zinc-400">シーン・映像キーワード（カンマ区切り）<textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm leading-6 text-white outline-none focus:border-violet-400" /></label>
                <div className="mt-4 rounded-xl border border-white/10 bg-black/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-xs font-medium text-zinc-200">映像素材を追加</p><p className="mt-1 text-[11px] text-zinc-500">Web経由は1ファイル4MB以下（動画・画像）</p></div>
                    <label className="cursor-pointer rounded-lg border border-white/15 px-4 py-2 text-xs text-zinc-200 hover:bg-white/5">{uploading ? "アップロード中…" : "ファイルを選択"}<input type="file" multiple accept=".mp4,.mov,.avi,.flv,.mkv,.webm,.jpg,.jpeg,.png,.bmp" disabled={uploading} onChange={(event) => { uploadMaterials(event.currentTarget.files); event.currentTarget.value = ""; }} className="hidden" /></label>
                  </div>
                  <p className="mt-3 text-[11px] text-zinc-400">アップロード済み：{materials.length}ファイル</p>
                  {materials.length > 0 && <ul className="mt-2 space-y-1 text-[11px] text-emerald-200">{materials.map((item) => <li key={item}>✓ {item}</li>)}</ul>}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs text-zinc-400">映像素材1カットの長さ<select value={clipDuration} onChange={(e) => setClipDuration(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white"><option value="3">3秒</option><option value="5">5秒</option><option value="8">8秒</option><option value="10">10秒</option><option value="15">15秒</option></select></label>
                  <label className="flex items-center gap-3 self-end rounded-xl border border-white/10 bg-black px-4 py-3 text-xs text-zinc-300"><input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} className="h-4 w-4 accent-violet-400" />日本語字幕を焼き込む</label>
                </div>
                <div className="mt-5 rounded-xl border border-white/10 bg-black/50 p-4 text-xs leading-6 text-zinc-500">出力形式：縦型 9:16 ／ 1080×1920 ／ 1本ずつ生成。MoneyPrinterTurboがアップロード素材を編集し、音声・字幕・BGMを合成します。素材映像そのものをAIで新規生成する機能は別途AI動画モデルが必要です。</div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-xs leading-5 text-zinc-500">無料利用が確認できていないAI動画APIには接続しません。無料設定済みエンジンが接続された場合のみ生成できます。</p>
                <button disabled={working || status !== "ready" || !script.trim() || !title.trim()} onClick={generate} className="rounded-xl bg-white px-7 py-4 text-sm font-semibold text-black transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400">{working ? "制作中…" : "ショートドラマを生成"}</button>
              </div>

              {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200">{error}</div>}
              {job && <div className="rounded-2xl border border-white/10 bg-[#101010] p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">生成タスク</h3><span className="text-xs text-zinc-400">{job.progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${Math.min(100, job.progress)}%` }} /></div><p className="mt-3 break-all text-[11px] text-zinc-500">Task ID: {job.taskId}</p>{job.videos.map((video, index) => <video key={video} src={video.startsWith("http") ? video : `/api/drama/media?path=${encodeURIComponent(video)}`} controls playsInline className="mt-4 w-full max-w-sm rounded-xl" />)}</div>}
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#101010] p-5"><p className="text-[10px] uppercase tracking-[0.24em] text-violet-300">Production flow</p><ol className="mt-5 space-y-4 text-sm">{["シナリオ確定","シーン素材の生成","日本語音声・字幕","縦型動画の合成","完成動画の確認"].map((item, index) => <li key={item} className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-[10px] text-zinc-400">{String(index + 1).padStart(2, "0")}</span><span className="text-zinc-300">{item}</span></li>)}</ol></div>
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-5"><p className="text-xs font-semibold text-amber-200">無料運用について</p><p className="mt-2 text-xs leading-6 text-zinc-400">動画生成APIの無料枠は提供元の条件次第です。残高不足や有料タスクが発生する設定では、Zenova側から生成リクエストを送らない設計です。</p></div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
