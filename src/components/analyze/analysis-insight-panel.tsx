"use client";

import type { AnalysisInsightCard } from "@/lib/analyze/analysis-insight";

function Stars({ count }: { count: number }) {
  const n = Math.max(1, Math.min(5, count));
  return (
    <span className="tracking-tight text-amber-300" aria-label={`${n}/5`}>
      {"★".repeat(n)}
      <span className="text-zinc-600">{"★".repeat(5 - n)}</span>
    </span>
  );
}

/**
 * AI分析結果 = 販売企画書
 */
export function AnalysisInsightPanel({
  insight,
}: {
  insight: AnalysisInsightCard;
}) {
  const brief = insight.salesBrief;
  const understanding = brief.productUnderstanding;
  const tiktok = brief.tiktok;
  const videoScore = brief.videoScore;
  const persona = understanding.persona;

  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-white">販売企画書</h3>
          <p className="mt-1 text-xs text-gray-500">
            誰に何を売る動画なのか — AIが販売担当者視点で整理します
          </p>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-1 text-[11px] text-emerald-300">
          AI分析
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
          <p className="text-xs text-gray-500">商品評価スコア</p>
          <p className="mt-2 text-sm text-gray-400">売れる可能性</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-white">
            {insight.sellScore}
            <span className="ml-1 text-base font-medium text-gray-500">
              / 100
            </span>
          </p>
          <p className="mt-1 text-xs text-emerald-400/90">
            {insight.sellScoreLabel}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
          <p className="text-xs text-gray-500">ターゲット</p>
          <p className="mt-3 text-sm leading-relaxed text-white">
            {insight.target}
          </p>
        </div>
      </div>

      {/* AI販売スコア */}
      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/15 p-4">
        <h4 className="text-sm font-semibold text-amber-100">AI販売スコア</h4>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500">販売動画適性</p>
            <p className="mt-1 text-lg">
              <Stars count={videoScore.suitabilityStars} />
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">動画化おすすめ度</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {videoScore.videoReadyScore}
              <span className="ml-1 text-sm font-medium text-gray-500">点</span>
            </p>
          </div>
        </div>
        <ul className="mt-3 space-y-1 text-sm text-gray-300">
          {videoScore.reasons.map((r) => (
            <li key={r}>・{r}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4">
        <p className="text-xs text-gray-500">刺さるポイント</p>
        <ul className="mt-3 space-y-1.5 text-sm text-gray-300">
          {insight.sellPoints.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="text-emerald-400">・</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
        <p className="text-xs text-emerald-400/90">おすすめ動画形式</p>
        <p className="mt-2 text-lg font-semibold text-white">
          {insight.recommendedFormatLabel}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          理由: {insight.reason}
        </p>
      </div>

      {/* 商品概要 */}
      <div className="mt-5 rounded-xl border border-zinc-800 bg-black/40 p-4">
        <h4 className="text-sm font-semibold text-white">商品概要</h4>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs text-gray-500">商品カテゴリ</dt>
            <dd className="mt-1 text-white">{understanding.category}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">想定購入者</dt>
            <dd className="mt-1 space-y-0.5 text-gray-300">
              {understanding.buyers.map((b) => (
                <p key={b}>・{b}</p>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">購入する理由</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {understanding.purchaseReasons.map((r) => (
                <span
                  key={r}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-gray-300"
                >
                  「{r}」
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">解決する悩み</dt>
            <dd className="mt-1 space-y-0.5 text-gray-300">
              {understanding.painPoints.map((p) => (
                <p key={p}>・{p}</p>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">競合との差別化ポイント</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {understanding.differentiators.map((d) => (
                <span
                  key={d}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-gray-300"
                >
                  「{d}」
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </div>

      {/* 販売角度 */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4">
        <h4 className="text-sm font-semibold text-white">販売角度</h4>
        <ul className="mt-3 space-y-2 text-sm text-gray-300">
          {understanding.salesAngles.map((a) => (
            <li
              key={a}
              className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2"
            >
              「{a}」
            </li>
          ))}
        </ul>
      </div>

      {/* ターゲット人物像 */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4">
        <h4 className="text-sm font-semibold text-white">ターゲット人物像</h4>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">名前</dt>
            <dd className="mt-1 text-white">{persona.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">年齢</dt>
            <dd className="mt-1 text-white">{persona.age}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500">生活スタイル</dt>
            <dd className="mt-1 text-gray-300">{persona.lifestyle}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500">悩み</dt>
            <dd className="mt-1 text-gray-300">{persona.pain}</dd>
          </div>
        </dl>
      </div>

      {/* TikTok向け分析 */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4">
        <h4 className="text-sm font-semibold text-white">TikTok向け分析</h4>
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="text-xs text-gray-500">フック力</p>
            <p className="mt-1 text-lg">
              <Stars count={tiktok.hookPowerStars} />
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">感情トリガー</p>
            <ul className="mt-2 space-y-1 text-gray-300">
              {tiktok.emotionTriggers.map((t) => (
                <li key={t}>・{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs text-gray-500">おすすめ冒頭3秒</p>
            <ul className="mt-2 space-y-1.5 text-white">
              {tiktok.openingHooks.map((h) => (
                <li
                  key={h}
                  className="rounded-lg bg-zinc-950/80 px-3 py-2 text-sm"
                >
                  「{h}」
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
