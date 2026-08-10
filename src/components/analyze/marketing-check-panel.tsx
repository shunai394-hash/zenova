"use client";

import type { MarketingCheckReport } from "@/lib/ai-marketing-engine";

function Stars({ count }: { count: number }) {
  const n = Math.max(1, Math.min(5, count));
  return (
    <span className="tracking-tight text-amber-300" aria-label={`${n}/5`}>
      {"★".repeat(n)}
      <span className="text-zinc-600">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function ForecastBar({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: number;
}) {
  const tone =
    value >= 75 ? "bg-emerald-500" : value >= 60 ? "bg-amber-400" : "bg-zinc-500";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-gray-300">
          <span className="mr-1.5" aria-hidden>
            {emoji}
          </span>
          {label}
        </span>
        <span className="font-semibold text-white">{value}%</span>
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

/**
 * 投稿前 AI マーケティング診断パネル
 */
export function MarketingCheckPanel({
  report,
  onRerun,
}: {
  report: MarketingCheckReport;
  onRerun?: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* 総合評価 */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">
              AIマーケティング診断
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              マーケター目線で投稿前に評価します
            </p>
          </div>
          {onRerun && (
            <button
              type="button"
              onClick={onRerun}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-zinc-800"
            >
              再診断
            </button>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4">
          <p className="text-xs text-emerald-400/90">総合評価</p>
          <p className="mt-1 text-sm text-gray-400">動画販売力スコア</p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-white">
            {report.salesPowerScore}
            <span className="ml-1 text-base font-medium text-gray-500">点</span>
          </p>
          <ul className="mt-3 space-y-1 text-sm text-gray-300">
            {report.scoreReasons.map((r) => (
              <li key={r}>・{r}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5項目評価 */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-white">5項目評価</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {report.criteria.map((c, index) => (
            <div
              key={c.id}
              className="rounded-xl border border-zinc-800 bg-black/40 p-4"
            >
              <p className="text-xs text-gray-500">
                {["①", "②", "③", "④", "⑤"][index] || `${index + 1}.`}{" "}
                {c.label}
              </p>
              <p className="mt-2 text-lg">
                <Stars count={c.stars} />
              </p>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                {c.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 改善優先順位 */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-white">改善優先度</h3>
        <p className="mt-1 text-xs text-gray-500">
          AIが改善するべき順番
        </p>
        <ol className="mt-4 space-y-3">
          {report.priorities.map((p) => (
            <li
              key={p.rank}
              className="flex gap-3 rounded-xl border border-zinc-800 bg-black/40 px-4 py-3"
            >
              <span className="shrink-0 text-sm font-semibold text-amber-300">
                {p.rank}位
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white">
                  {p.title}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  理由：{p.reason}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* 投稿シミュレーション */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-white">投稿シミュレーション</h3>
        <p className="mt-1 text-xs text-amber-200/80">
          {report.simulation.disclaimer}
        </p>

        <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4">
          <p className="text-xs text-gray-500">AI予測</p>
          <p className="mt-2 text-xs text-gray-500">想定視聴者</p>
          <p className="mt-1 text-sm font-medium text-white">
            {report.simulation.audience}
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-xs text-gray-500">期待反応</p>
          <ForecastBar
            emoji="👍"
            label="保存されやすさ"
            value={report.simulation.saveLikelihood}
          />
          <ForecastBar
            emoji="💬"
            label="コメントされやすさ"
            value={report.simulation.commentLikelihood}
          />
          <ForecastBar
            emoji="🛒"
            label="購入につながる可能性"
            value={report.simulation.purchaseLikelihood}
          />
        </div>
      </section>
    </div>
  );
}
