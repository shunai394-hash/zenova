"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GeneratedVideoHistoryItem } from "@/lib/sales-data/video-history-types";
import {
  getHistoryStatusClass,
  getHistoryStatusLabel,
  LOOP_STATUS_FLOW,
} from "@/lib/sales-data/history-status";
import { getVideoStyleLabel } from "@/lib/analyze/video-settings";
import {
  analyzePostFeedback,
  buildImprovementRecord,
  generateNextVideoIdeas,
  type NextVideoIdea,
  type PostPlatform,
  type PostResultMetrics,
  type VideoLoopStatus,
} from "@/lib/ai-optimization-engine";
import {
  loadVideoLoopRecord,
  resolveLoopStatus,
  saveVideoLoopRecord,
  type VideoLoopLocalRecord,
} from "@/lib/optimization/video-loop-storage";

const PLATFORM_OPTIONS: { id: PostPlatform; label: string }[] = [
  { id: "tiktok", label: "TikTok" },
  { id: "youtube_shorts", label: "YouTube Shorts" },
  { id: "instagram_reels", label: "Instagram Reels" },
];

function formatCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function num(v: string): number {
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function buildAnalyzeHref(item: GeneratedVideoHistoryItem, idea?: NextVideoIdea) {
  const params = new URLSearchParams();
  if (item.product_id) params.set("product", item.product_id);
  if (idea?.hook) params.set("hook", idea.hook);
  if (idea?.target) params.set("target", idea.target);
  if (idea?.focus) params.set("nextFocus", idea.focus);
  params.set("from", "optimization-loop");
  return `/analyze?${params.toString()}`;
}

export function HistoryVideoCard({
  item,
  initialExpandForm,
  regenerating,
  downloading,
  deleting,
  onRegenerate,
  onDownload,
  onDelete,
}: {
  item: GeneratedVideoHistoryItem;
  initialExpandForm?: boolean;
  regenerating?: boolean;
  downloading?: boolean;
  deleting?: boolean;
  onRegenerate: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const [loop, setLoop] = useState<VideoLoopLocalRecord | null>(() =>
    loadVideoLoopRecord(item.id)
  );
  const [showForm, setShowForm] = useState(Boolean(initialExpandForm));
  const [platform, setPlatform] = useState<PostPlatform>(
    loop?.postResult?.platform || "tiktok"
  );
  const [views, setViews] = useState(String(loop?.postResult?.views ?? ""));
  const [likes, setLikes] = useState(String(loop?.postResult?.likes ?? ""));
  const [comments, setComments] = useState(
    String(loop?.postResult?.comments ?? "")
  );
  const [saves, setSaves] = useState(String(loop?.postResult?.saves ?? ""));
  const [clicks, setClicks] = useState(
    loop?.postResult?.clicks != null ? String(loop.postResult.clicks) : ""
  );
  const [purchases, setPurchases] = useState(
    loop?.postResult?.purchases != null
      ? String(loop.postResult.purchases)
      : ""
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [generatingNext, setGeneratingNext] = useState(false);

  const postStatus: VideoLoopStatus =
    loop?.postStatus ||
    resolveLoopStatus(item.id, item.post_status || item.status);
  const typeLabel = item.style ? getVideoStyleLabel(item.style) : "—";
  const salesScore =
    item.marketing_score ?? item.score ?? loop?.improvement?.previous_score ?? null;

  const title = useMemo(() => {
    if (item.hook?.trim()) {
      const short = item.hook.trim().slice(0, 28);
      return short.length < item.hook.trim().length ? `${short}…` : short;
    }
    return item.product_name;
  }, [item.hook, item.product_name]);

  const persist = (next: VideoLoopLocalRecord) => {
    const saved = saveVideoLoopRecord(next);
    setLoop(saved);
  };

  const setStatus = (status: VideoLoopStatus) => {
    persist({
      videoId: item.id,
      postStatus: status,
      postResult: loop?.postResult ?? null,
      reflection: loop?.reflection ?? null,
      improvement: loop?.improvement ?? null,
      nextIdeas: loop?.nextIdeas ?? null,
      updatedAt: new Date().toISOString(),
    });
  };

  const submitResults = () => {
    setFormError(null);
    const metrics: PostResultMetrics = {
      platform,
      views: num(views),
      likes: num(likes),
      comments: num(comments),
      saves: num(saves),
      clicks: clicks.trim() === "" ? null : num(clicks),
      purchases: purchases.trim() === "" ? null : num(purchases),
    };
    if (metrics.views <= 0) {
      setFormError("再生数を入力してください");
      return;
    }

    const previousScore =
      item.marketing_score ?? item.score ?? loop?.improvement?.previous_score ?? 70;

    const reflection = analyzePostFeedback({
      productName: item.product_name,
      hook: item.hook,
      style: item.style,
      target: item.target,
      previousScore,
      metrics,
    });

    const improvement = buildImprovementRecord({
      previousScore,
      metrics,
      reflection,
    });

    persist({
      videoId: item.id,
      postStatus: "posted",
      postResult: metrics,
      reflection,
      improvement,
      nextIdeas: loop?.nextIdeas ?? null,
      updatedAt: new Date().toISOString(),
    });
    setShowForm(false);
  };

  const runNextIdeas = () => {
    setGeneratingNext(true);
    try {
      const ideas = generateNextVideoIdeas({
        productName: item.product_name,
        productId: item.product_id,
        hook: item.hook,
        target: item.target,
        style: item.style,
        reflection: loop?.reflection,
        metrics: loop?.postResult,
      });
      const planSummary = ideas.map((i) => i.focusLabel).join(" / ");
      const improvement =
        loop?.improvement && loop.reflection
          ? {
              ...loop.improvement,
              next_video_plan: `次回検証: ${planSummary} — ${ideas[0]?.title || ""}`,
            }
          : loop?.improvement ?? null;

      persist({
        videoId: item.id,
        postStatus: "improving",
        postResult: loop?.postResult ?? null,
        reflection: loop?.reflection ?? null,
        improvement,
        nextIdeas: ideas,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setGeneratingNext(false);
    }
  };

  const thumb = item.thumbnail_url || item.image_url;

  return (
    <li className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch">
        <div className="relative aspect-[9/16] w-full max-w-[120px] shrink-0 overflow-hidden rounded-xl bg-zinc-950 sm:max-w-[140px]">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={item.product_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-gray-600">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] text-gray-500">動画タイトル</p>
              <h2 className="truncate text-base font-semibold text-white">
                {title}
              </h2>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {item.product_name}
              </p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getHistoryStatusClass(postStatus)}`}
            >
              {getHistoryStatusLabel(postStatus)}
            </span>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            作成日: {formatCreatedAt(item.created_at)}
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
            <span className="rounded bg-zinc-950 px-2 py-1">
              動画タイプ: {typeLabel}
            </span>
            {salesScore != null && (
              <span className="rounded bg-emerald-950/60 px-2 py-1 text-emerald-300">
                AI販売スコア {salesScore}
              </span>
            )}
            <span className="rounded bg-zinc-950 px-2 py-1">
              投稿状態: {getHistoryStatusLabel(postStatus)}
            </span>
          </div>

          {/* ステータス切替 */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {LOOP_STATUS_FLOW.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-lg border px-2 py-1 text-[10px] transition ${
                  postStatus === s
                    ? getHistoryStatusClass(s)
                    : "border-zinc-800 bg-zinc-950 text-gray-500 hover:border-zinc-600"
                }`}
              >
                {getHistoryStatusLabel(s)}
              </button>
            ))}
          </div>

          {item.hook && (
            <p className="mt-3 line-clamp-2 text-sm text-gray-400">
              Hook: {item.hook}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-950/40"
            >
              {showForm ? "入力を閉じる" : "投稿結果を入力"}
            </button>
            <button
              type="button"
              disabled={generatingNext}
              onClick={runNextIdeas}
              className="rounded-xl border border-violet-500/40 bg-violet-950/20 px-3 py-2 text-xs font-medium text-violet-200 hover:bg-violet-950/40 disabled:opacity-40"
            >
              {generatingNext ? "生成中..." : "次の動画案をAI生成"}
            </button>
            <button
              type="button"
              disabled={Boolean(regenerating)}
              onClick={onRegenerate}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-gray-200 hover:bg-zinc-800 disabled:opacity-40"
            >
              {regenerating ? "再生成中..." : "再生成"}
            </button>
            <button
              type="button"
              disabled={!item.video_url || Boolean(downloading)}
              onClick={onDownload}
              className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-40"
            >
              {downloading ? "DL中..." : "ダウンロード"}
            </button>
            <Link
              href={buildAnalyzeHref(item)}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-gray-200 hover:bg-zinc-800"
            >
              この商品で動画を作る
            </Link>
            <button
              type="button"
              disabled={Boolean(deleting)}
              onClick={onDelete}
              className="rounded-xl border border-red-500/40 px-3 py-2 text-xs text-red-300 hover:bg-red-950/40 disabled:opacity-40"
            >
              {deleting ? "削除中..." : "削除"}
            </button>
          </div>
        </div>
      </div>

      {/* 投稿結果入力 */}
      {showForm && (
        <div className="border-t border-zinc-800 bg-black/40 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-white">投稿結果入力</h3>
          <p className="mt-1 text-xs text-gray-500">
            投稿後の数値を入れると、AIが振り返りと次回改善を提案します
          </p>

          <div className="mt-4">
            <p className="text-xs text-gray-500">投稿先</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id)}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    platform === p.id
                      ? "border-white bg-white text-black"
                      : "border-zinc-700 bg-zinc-950 text-gray-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["再生数", views, setViews, true],
                ["いいね数", likes, setLikes, true],
                ["コメント数", comments, setComments, true],
                ["保存数", saves, setSaves, true],
                ["クリック数（任意）", clicks, setClicks, false],
                ["購入数（任意）", purchases, setPurchases, false],
              ] as const
            ).map(([label, value, setter]) => (
              <label key={label} className="block text-xs text-gray-500">
                {label}
                <input
                  type="number"
                  min={0}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-500"
                />
              </label>
            ))}
          </div>

          {formError && (
            <p className="mt-3 text-xs text-red-300">{formError}</p>
          )}

          <button
            type="button"
            onClick={submitResults}
            className="mt-4 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-gray-100"
          >
            AI振り返りを実行
          </button>
        </div>
      )}

      {/* AI振り返り */}
      {loop?.reflection && (
        <div className="border-t border-zinc-800 bg-emerald-950/10 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-white">今回の動画分析</h3>
          <p className="mt-1 text-xs text-gray-500">{loop.reflection.summary}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-emerald-400/90">良かった点</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-300">
                {loop.reflection.strengths.map((s) => (
                  <li key={s}>・{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs text-amber-300/90">改善点</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-300">
                {loop.reflection.improvements.map((s) => (
                  <li key={s}>・{s}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-violet-300/90">次回動画への提案</p>
            <ul className="mt-2 space-y-1 text-sm text-white">
              {loop.reflection.nextSuggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          {loop.improvement && (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs text-gray-400">
              <p>
                改善履歴: {loop.improvement.previous_score}点 →{" "}
                <span className="text-emerald-300">
                  {loop.improvement.after_score}点
                </span>
              </p>
              <p className="mt-1">理由: {loop.improvement.improvement_reason}</p>
              <p className="mt-1">次計画: {loop.improvement.next_video_plan}</p>
            </div>
          )}
        </div>
      )}

      {/* 次の動画3案 */}
      {loop?.nextIdeas && loop.nextIdeas.length > 0 && (
        <div className="border-t border-zinc-800 bg-violet-950/10 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-white">次の動画案（AI）</h3>
          <p className="mt-1 text-xs text-gray-500">
            同じ商品で別フック・別ターゲット・別構成
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {loop.nextIdeas.map((idea) => (
              <div
                key={idea.id}
                className="rounded-xl border border-zinc-800 bg-black/40 p-3"
              >
                <p className="text-[11px] text-violet-300">{idea.focusLabel}</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {idea.title}
                </p>
                <p className="mt-2 text-xs text-gray-500">ターゲット</p>
                <p className="text-xs text-gray-300">{idea.target}</p>
                <p className="mt-2 text-xs text-gray-500">フック</p>
                <p className="text-xs text-gray-300">「{idea.hook}」</p>
                <ul className="mt-2 space-y-0.5 text-[11px] text-gray-500">
                  {idea.structure.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-gray-500">{idea.reason}</p>
                <Link
                  href={buildAnalyzeHref(item, idea)}
                  className="mt-3 inline-flex rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-black"
                >
                  この案で作る
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}
