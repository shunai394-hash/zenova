"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import {
  buildEditHref,
  buildImproveEditHref,
  buildRegenerateHref,
  loadVideoPreviewPayload,
  saveVideoPreviewPayload,
  type ImproveKind,
  type VideoPreviewPayload,
} from "@/lib/analyze/preview-session";
import {
  buildImproveSuggestion,
  buildPostChecklist,
  checklistAllOk,
  evaluatePreviewVideo,
  type ImproveSuggestion,
} from "@/lib/analyze/preview-insights";
import {
  buildVideoIntentBrief,
  optimizeSalesVideo,
  type VideoOptimizationResult,
} from "@/lib/ai-sales-engine";
import {
  runMarketingCheck,
  type MarketingCheckReport,
} from "@/lib/ai-marketing-engine";
import { SnsPostPrepPanel } from "@/components/analyze/sns-post-prep-panel";
import { MarketingCheckPanel } from "@/components/analyze/marketing-check-panel";

async function downloadVideo(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ダウンロード失敗 (HTTP ${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function structureLines(structure: string | null | undefined): string[] {
  if (!structure?.trim()) return [];
  return structure
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 80 ? "bg-emerald-500" : value >= 65 ? "bg-amber-400" : "bg-zinc-500";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${tone} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function PreviewContent() {
  const searchParams = useSearchParams();
  const [payload, setPayload] = useState<VideoPreviewPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<ImproveSuggestion | null>(null);
  const [optimization, setOptimization] =
    useState<VideoOptimizationResult | null>(null);
  const [marketingReport, setMarketingReport] =
    useState<MarketingCheckReport | null>(null);
  const [marketingChecked, setMarketingChecked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fromSession = loadVideoPreviewPayload();
    const url = searchParams.get("url")?.trim() || fromSession?.videoUrl || "";
    if (!url) {
      setPayload(null);
      return;
    }

    const titleParam =
      searchParams.get("title")?.trim() ||
      searchParams.get("name")?.trim() ||
      null;

    setPayload({
      videoUrl: url,
      videoId: searchParams.get("id") || fromSession?.videoId || null,
      productId:
        searchParams.get("product") || fromSession?.productId || null,
      title:
        titleParam ||
        fromSession?.title ||
        fromSession?.productName ||
        null,
      productName:
        titleParam || fromSession?.productName || fromSession?.title || null,
      productDescription: fromSession?.productDescription ?? null,
      score: searchParams.get("score")
        ? Number(searchParams.get("score"))
        : (fromSession?.score ?? null),
      hook: fromSession?.hook ?? null,
      cta: fromSession?.cta ?? null,
      sellingAngle: fromSession?.sellingAngle ?? null,
      style: searchParams.get("style") || fromSession?.style || null,
      structure: fromSession?.structure ?? null,
      speaker: fromSession?.speaker ?? null,
      captionsEnabled: fromSession?.captionsEnabled ?? null,
      durationSec: fromSession?.durationSec ?? null,
      isVertical: fromSession?.isVertical ?? true,
      createdAt: fromSession?.createdAt ?? new Date().toISOString(),
      videoPlan: fromSession?.videoPlan ?? null,
      videoResult: fromSession?.videoResult ?? null,
      videoIdea: fromSession?.videoIdea ?? null,
      marketingCheck: fromSession?.marketingCheck ?? null,
      marketingChecked: fromSession?.marketingChecked ?? null,
    });
    if (fromSession?.marketingCheck && fromSession.marketingChecked) {
      setMarketingReport(fromSession.marketingCheck);
      setMarketingChecked(true);
    } else {
      setMarketingReport(null);
      setMarketingChecked(false);
    }
  }, [searchParams]);

  const videoTitle = useMemo(() => {
    const base =
      payload?.title?.trim() ||
      payload?.productName?.trim() ||
      "無題の動画";
    const style = payload?.style?.trim();
    if (style && !base.includes(style)) {
      return `${base}（${style}）`;
    }
    return base;
  }, [payload?.title, payload?.productName, payload?.style]);

  const beats = useMemo(
    () => structureLines(payload?.structure),
    [payload?.structure]
  );

  const evaluation = useMemo(
    () => (payload ? evaluatePreviewVideo(payload) : null),
    [payload]
  );

  const checklist = useMemo(
    () => (payload ? buildPostChecklist(payload) : []),
    [payload]
  );

  const allChecklistOk = checklistAllOk(checklist);
  const manualAllChecked =
    checklist.length > 0 &&
    checklist.every((item) => checked[item.id] ?? item.ok);

  const regenerateHref = payload ? buildRegenerateHref(payload) : "/analyze";
  const editHref = payload ? buildEditHref(payload) : "/analyze";

  const runImprove = (kind: ImproveKind) => {
    if (!payload) return;
    setSuggestion(buildImproveSuggestion(kind, payload));
    setCopied(false);
  };

  const intentBrief = useMemo(
    () =>
      payload
        ? buildVideoIntentBrief({
            goal: payload.videoPlan?.goal || payload.videoIdea?.goal,
            targetAudience:
              payload.videoIdea?.target ||
              payload.videoIdea?.targetAudience ||
              payload.videoIdea?.whoFor,
            whoFor: payload.videoIdea?.whoFor,
            feature: payload.videoIdea?.feature,
            concept: payload.videoIdea?.concept,
          })
        : null,
    [payload]
  );

  const runMarketingDiagnosis = (source?: VideoPreviewPayload | null) => {
    const p = source ?? payload;
    if (!p) return;
    const report = runMarketingCheck({
      productName: p.productName || p.title,
      hook: p.hook || p.videoIdea?.hook,
      cta: p.cta || p.videoPlan?.cta || p.videoIdea?.cta,
      structure: p.structure,
      style: p.style || p.videoPlan?.style,
      durationSec: p.durationSec || p.videoPlan?.duration,
      isVertical: p.isVertical,
      captionsEnabled: p.captionsEnabled,
      sellingAngle: p.sellingAngle,
      targetAudience: p.videoIdea?.targetAudience,
      whoFor: p.videoIdea?.whoFor,
      target: p.videoIdea?.target,
      problem: p.videoIdea?.problem,
      solution: p.videoIdea?.solution,
      goal: p.videoPlan?.goal || p.videoIdea?.goal,
      baseScore: p.score,
      productDescription: p.productDescription,
    });
    setMarketingReport(report);
    setMarketingChecked(true);
    const next: VideoPreviewPayload = {
      ...p,
      marketingCheck: report,
      marketingChecked: true,
      score: report.salesPowerScore,
    };
    setPayload(next);
    saveVideoPreviewPayload(next);
  };

  // 初回表示時に自動診断（未チェック時）
  useEffect(() => {
    if (!payload?.videoUrl) return;
    if (marketingChecked && marketingReport) return;
    if (payload.marketingChecked && payload.marketingCheck) return;
    runMarketingDiagnosis(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 初回のみ
  }, [payload?.videoUrl]);

  const runAiOptimize = () => {
    if (!payload) return;
    setOptimization(
      optimizeSalesVideo({
        hook: payload.hook || payload.videoIdea?.hook,
        cta: payload.cta || payload.videoPlan?.cta || payload.videoIdea?.cta,
        structure: payload.structure,
        durationSec: payload.durationSec || payload.videoPlan?.duration,
        productName: payload.productName || payload.title,
        style: payload.style || payload.videoPlan?.style,
        goal: payload.videoPlan?.goal || payload.videoIdea?.goal,
        targetAudience:
          payload.videoIdea?.target || payload.videoIdea?.targetAudience,
        whoFor: payload.videoIdea?.whoFor,
      })
    );
    setSuggestion(buildImproveSuggestion("hook", payload));
    setCopied(false);
  };

  const applySuggestionLocally = () => {
    if (!payload || !suggestion) return;
    const next: VideoPreviewPayload = { ...payload };
    if (suggestion.kind === "hook") {
      next.hook = suggestion.after;
    } else if (suggestion.kind === "cta") {
      next.cta = suggestion.after;
    } else if (suggestion.kind === "tiktok") {
      next.captionsEnabled = true;
      if (!next.cta?.trim()) {
        next.cta =
          "気になった人はプロフィールのリンクからチェックしてね（保存も忘れずに）";
      }
      if (next.hook && !/[？?]/.test(next.hook)) {
        next.hook = `${next.hook}、知ってた？`;
      }
    }
    setPayload(next);
    saveVideoPreviewPayload(next);
    setSavedHint("改善案をプレビューに反映しました。再生成で映像にも適用できます。");
  };

  if (!payload?.videoUrl) {
    return (
      <div className="mt-16 text-center">
        <p className="text-sm text-gray-400">
          プレビューする動画がありません。Analyze で動画を生成してください。
        </p>
        <Link
          href="/analyze"
          className="mt-6 inline-block rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black"
        >
          動画を作る
        </Link>
      </div>
    );
  }

  const saveForPost = async () => {
    setSaving(true);
    setError(null);
    setSavedHint(null);
    try {
      const safe =
        (payload.productName || payload.title || "zenova_post")
          .replace(/[^\w\u3040-\u30ff\u4e00-\u9fff-]+/g, "_")
          .slice(0, 40) || "zenova_post";
      await downloadVideo(
        payload.videoUrl,
        `${safe}_${payload.durationSec ?? 15}s.mp4`
      );
      setSavedHint(
        "投稿用ファイルを保存しました。TikTokアプリからアップロードできます。"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 space-y-8 pb-16">
      <header className="space-y-3">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          動画が完成しました — 投稿前チェックへ
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {videoTitle}
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-gray-400">
          動画 → AIマーケティング診断 → 改善 → チェック → 投稿文コピー → 保存、までこの画面で完結します。
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-black">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">完成動画プレビュー</h2>
        </div>
        <video
          key={payload.videoUrl}
          src={payload.videoUrl}
          controls
          playsInline
          autoPlay
          className="mx-auto max-h-[55vh] w-full object-contain"
        />
      </section>

      {/* この動画が狙っていること */}
      {intentBrief && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-white">
            この動画が狙っていること
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            目的・視聴者・感情・購入導線
          </p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
              <dt className="text-xs text-gray-500">目的</dt>
              <dd className="mt-2 text-sm font-medium text-white">
                {intentBrief.purpose}
              </dd>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
              <dt className="text-xs text-gray-500">狙う視聴者</dt>
              <dd className="mt-2 text-sm font-medium text-white">
                {intentBrief.audience}
              </dd>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4 sm:col-span-2">
              <dt className="text-xs text-gray-500">感情</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {intentBrief.emotions.map((e) => (
                  <span
                    key={e}
                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-gray-300"
                  >
                    {e}
                  </span>
                ))}
              </dd>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4 sm:col-span-2">
              <dt className="text-xs text-gray-500">購入導線</dt>
              <dd className="mt-2 text-sm font-medium text-white">
                {intentBrief.purchasePath}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {/* 投稿前AIマーケティング診断 */}
      {marketingReport && (
        <MarketingCheckPanel
          report={marketingReport}
          onRerun={() => runMarketingDiagnosis()}
        />
      )}

      {/* 使用した動画企画 */}
      {payload.videoIdea && (
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-white">
            使用した動画企画
          </h2>
          <p className="mt-3 text-sm text-white">
            企画：
            <span className="ml-1 font-semibold">
              {payload.videoIdea.icon ? `${payload.videoIdea.icon} ` : ""}
              {payload.videoIdea.title}
              {payload.videoIdea.concept
                ? `（${payload.videoIdea.concept}）`
                : ""}
            </span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">
            狙い：
            <br />
            {payload.videoIdea.reason ||
              payload.videoIdea.feature ||
              payload.videoIdea.concept}
          </p>
          {payload.videoIdea.hook && (
            <p className="mt-3 text-xs text-gray-500">
              Hook: {payload.videoIdea.hook}
            </p>
          )}
        </section>
      )}

      {/* 動画構成タイムライン */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-white">動画構成</h2>
        <p className="mt-1 text-xs text-gray-500">
          {payload.videoPlan
            ? `${payload.videoPlan.title} · ${payload.videoPlan.style} · 約${payload.videoPlan.duration}秒`
            : "タイムライン"}
        </p>
        <ul className="mt-4 space-y-2">
          {(
            payload.videoPlan?.timeline ||
            payload.videoIdea?.timeline ||
            []
          ).map((item) => (
            <li
              key={`${item.second}-${item.scene}`}
              className="flex gap-3 rounded-xl border border-zinc-800 bg-black/40 px-4 py-3 text-sm"
            >
              <span className="shrink-0 font-mono text-xs text-emerald-400">
                {item.second}秒
              </span>
              <span className="min-w-0">
                <span className="font-medium text-white">{item.scene}</span>
                <span className="mt-0.5 block text-gray-400">{item.text}</span>
              </span>
            </li>
          ))}
          {!payload.videoPlan?.timeline?.length &&
            !payload.videoIdea?.timeline?.length && (
              <li className="text-sm text-gray-500">
                構成データがありません
              </li>
            )}
        </ul>
      </section>

      {/* AI評価 */}
      {evaluation && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">AI評価</h2>
              <p className="mt-1 text-xs text-gray-500">
                フック・維持・購入誘導の予測スコア
              </p>
            </div>
            {payload.score != null && !Number.isNaN(payload.score) && (
              <p className="text-sm text-gray-400">
                総合評価{" "}
                <span className="font-semibold text-white">{payload.score}</span>
              </p>
            )}
          </div>
          <div className="mt-5 space-y-4">
            <ScoreBar label="フック力" value={evaluation.hookPower} />
            <ScoreBar
              label="視聴維持予測"
              value={evaluation.retentionPredict}
            />
            <ScoreBar label="購入誘導" value={evaluation.purchaseGuide} />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-gray-400">
            {evaluation.summary}
          </p>
        </section>
      )}

      {/* AI改善 */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-white">AI改善</h2>
        <p className="mt-1 text-xs text-gray-500">
          冒頭3秒・見せ方・CTA・尺・ターゲットを販売向けに磨きます
        </p>
        <button
          type="button"
          onClick={runAiOptimize}
          className="mt-4 w-full rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-black transition hover:bg-gray-100 sm:w-auto"
        >
          AIで改善する
        </button>

        {optimization && (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-gray-300">{optimization.summary}</p>
            {optimization.items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4"
              >
                <p className="text-sm font-semibold text-emerald-200">
                  {item.label}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] tracking-wide text-gray-500">
                      改善前
                    </p>
                    <p className="mt-1 text-sm text-gray-400">{item.before}</p>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-wide text-emerald-500/80">
                      改善後
                    </p>
                    <p className="mt-1 text-sm text-white">{item.after}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">{item.tip}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(
            [
              ["hook", "冒頭3秒改善"],
              ["cta", "CTA改善"],
              ["tiktok", "TikTok向け最適化"],
            ] as const
          ).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              onClick={() => runImprove(kind)}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm font-medium text-gray-200 transition hover:border-emerald-500/50 hover:bg-zinc-900"
            >
              {label}
            </button>
          ))}
        </div>

        {suggestion && (
          <div className="mt-4 space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4">
            <p className="text-sm font-semibold text-emerald-200">
              {suggestion.label}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                  Before
                </p>
                <p className="mt-1 text-sm text-gray-400">{suggestion.before}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-emerald-500/80">
                  After
                </p>
                <p className="mt-1 text-sm text-white">{suggestion.after}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{suggestion.tip}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applySuggestionLocally}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-400"
              >
                改善を反映
              </button>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    const ok = await copyText(suggestion.after);
                    if (!ok) return;
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  })();
                }}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-gray-300 hover:bg-zinc-800"
              >
                {copied ? "コピー済み" : "コピー"}
              </button>
              <Link
                href={buildImproveEditHref(payload, suggestion.kind)}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-gray-300 hover:bg-zinc-800"
              >
                編集で再生成
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 3. 投稿前チェックリスト */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">
              投稿前チェックリスト
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              すべてOKなら、そのまま投稿できる状態です
            </p>
          </div>
          {(allChecklistOk || manualAllChecked) && (
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
              投稿準備OK
            </span>
          )}
        </div>

        <ul className="mt-4 space-y-2">
          {checklist.map((item) => {
            const isOn = checked[item.id] ?? item.ok;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() =>
                    setChecked((prev) => ({
                      ...prev,
                      [item.id]: !(prev[item.id] ?? item.ok),
                    }))
                  }
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    isOn
                      ? "border-emerald-500/30 bg-emerald-950/20"
                      : "border-zinc-800 bg-zinc-900/40"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                      isOn
                        ? "border-emerald-400 bg-emerald-500 text-black"
                        : "border-zinc-600 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {item.detail}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 投稿準備: SNS別コピー */}
      <SnsPostPrepPanel payload={payload} />

      {/* 次のアクション */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">次にどうしますか？</h2>
            <p className="mt-1 text-xs text-gray-500">
              投稿文をコピーしたら、動画を保存して各SNSへ投稿
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              marketingChecked
                ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                : "border-amber-500/40 bg-amber-950/40 text-amber-200"
            }`}
          >
            {marketingChecked ? "AIチェック完了" : "AIチェック未完了"}
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveForPost()}
            className="w-full rounded-xl bg-white px-5 py-4 text-left transition hover:bg-gray-100 disabled:opacity-40"
          >
            <span className="block text-sm font-semibold text-black">
              {saving ? "保存中..." : "投稿用に保存"}
            </span>
            <span className="mt-0.5 block text-xs text-zinc-600">
              MP4をダウンロードして、TikTokへそのまま投稿
            </span>
          </button>

          {!marketingChecked && (
            <button
              type="button"
              onClick={() => runMarketingDiagnosis()}
              className="w-full rounded-xl border border-amber-500/40 bg-amber-950/20 px-5 py-3.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-950/40"
            >
              AIマーケティング診断を実行
            </button>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href={editHref}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-4 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              <span className="block text-sm font-semibold text-white">
                編集へ進む
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                企画書・フック・CTAを直す
              </span>
            </Link>
            <Link
              href={regenerateHref}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-4 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              <span className="block text-sm font-semibold text-white">
                再生成する
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                改善内容を映像に反映
              </span>
            </Link>
          </div>

          <Link
            href={
              payload.videoId
                ? `/history?focus=${encodeURIComponent(payload.videoId)}&action=post-result`
                : "/history"
            }
            className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 px-5 py-4 text-center transition hover:bg-emerald-950/40"
          >
            <span className="block text-sm font-semibold text-emerald-100">
              投稿結果を入力する
            </span>
            <span className="mt-0.5 block text-xs text-emerald-200/70">
              履歴で数値を入れて、次の動画改善へ
            </span>
          </Link>

          <Link
            href="/history"
            className="rounded-xl border border-dashed border-zinc-700 px-5 py-4 text-center transition hover:border-zinc-500 hover:bg-zinc-900/50"
          >
            <span className="block text-sm font-semibold text-gray-200">
              マイ動画履歴を見る
            </span>
          </Link>
        </div>

        {savedHint && (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-200">
            {savedHint}
          </p>
        )}
        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      </section>

      {/* スタイル + 構成 */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            使用スタイル
          </h3>
          <p className="mt-3 text-lg font-semibold text-white">
            {payload.style || "未設定"}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-gray-400">
            {payload.durationSec != null && (
              <li>尺: {payload.durationSec}秒</li>
            )}
            {payload.speaker && <li>音声: {payload.speaker}</li>}
            {payload.captionsEnabled != null && (
              <li>字幕: {payload.captionsEnabled ? "ON" : "OFF"}</li>
            )}
            {payload.cta && <li>CTA: {payload.cta}</li>}
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            使用したAI構成
          </h3>
          {beats.length > 0 ? (
            <ol className="mt-3 space-y-2">
              {beats.map((line, i) => (
                <li
                  key={`${i}-${line.slice(0, 12)}`}
                  className="flex gap-2 text-sm text-gray-300"
                >
                  <span className="shrink-0 text-emerald-400/80">{i + 1}.</span>
                  <span className="leading-relaxed">
                    {line.replace(/^\d+[\.\)\、]\s*/, "")}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-gray-500">構成データなし</p>
          )}
          {payload.hook && (
            <p className="mt-4 border-t border-zinc-800 pt-3 text-sm text-gray-400">
              <span className="text-gray-500">最初の3秒: </span>
              {payload.hook}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Suspense
          fallback={
            <p className="mt-10 text-sm text-gray-500">読み込み中...</p>
          }
        >
          <PreviewContent />
        </Suspense>
      </div>
    </main>
  );
}
