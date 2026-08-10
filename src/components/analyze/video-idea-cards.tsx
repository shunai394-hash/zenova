"use client";

import type { VideoIdea } from "@/lib/video-pipeline";

const GOAL_LABEL: Record<string, string> = {
  purchase: "購入につなげる",
  affiliate_click: "アフィリエイトクリック",
  brand_awareness: "認知・信頼",
};

/**
 * おすすめ動画企画 — 販売目的別3カード（具体化）
 */
export function VideoIdeaCards({
  ideas,
  selectedId,
  disabled,
  onSelect,
}: {
  ideas: VideoIdea[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (idea: VideoIdea) => void;
}) {
  if (ideas.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-zinc-700 bg-black/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-white">
            おすすめ動画企画
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            タイトル・ターゲット・冒頭・構成まで具体化した3案です
          </p>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-1 text-[11px] text-emerald-300">
          AIが3案提案
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {ideas.map((idea, index) => {
          const active = selectedId === idea.id;
          return (
            <button
              key={idea.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(idea)}
              className={`rounded-2xl border p-4 text-left transition disabled:opacity-40 ${
                active
                  ? "border-white bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
                  : "border-zinc-700 bg-zinc-950 text-gray-300 hover:border-zinc-500"
              }`}
            >
              <p
                className={`text-[11px] font-medium ${
                  active ? "text-zinc-500" : "text-gray-600"
                }`}
              >
                {["①", "②", "③"][index] || `${index + 1}.`}{" "}
                {idea.concept}
              </p>
              <p className="mt-2 flex items-start gap-2 text-base font-semibold leading-snug">
                <span aria-hidden>{idea.icon || "🎬"}</span>
                <span>{idea.title}</span>
              </p>

              <dl
                className={`mt-3 space-y-2 text-xs leading-relaxed ${
                  active ? "text-zinc-600" : "text-gray-500"
                }`}
              >
                <div>
                  <dt className="font-medium">ターゲット</dt>
                  <dd>{idea.target || idea.targetAudience}</dd>
                </div>
                <div>
                  <dt className="font-medium">冒頭3秒</dt>
                  <dd>「{idea.hook}」</dd>
                </div>
                {idea.problem && (
                  <div>
                    <dt className="font-medium">悩み</dt>
                    <dd>{idea.problem}</dd>
                  </div>
                )}
                {idea.solution && (
                  <div>
                    <dt className="font-medium">解決</dt>
                    <dd>{idea.solution}</dd>
                  </div>
                )}
                {idea.goal && (
                  <div>
                    <dt className="font-medium">目的</dt>
                    <dd>{GOAL_LABEL[idea.goal] || idea.goal}</dd>
                  </div>
                )}
              </dl>

              {idea.timeline.length > 0 && (
                <ul
                  className={`mt-3 space-y-1 border-t pt-3 text-[11px] ${
                    active
                      ? "border-zinc-200 text-zinc-500"
                      : "border-zinc-800 text-gray-600"
                  }`}
                >
                  {idea.timeline.map((t) => (
                    <li key={`${t.second}-${t.scene}`}>
                      {t.second}秒 {t.scene}
                    </li>
                  ))}
                </ul>
              )}

              <p
                className={`mt-3 text-[11px] ${
                  active ? "text-zinc-500" : "text-gray-600"
                }`}
              >
                CTA：{idea.cta}
              </p>

              {active && (
                <p className="mt-3 text-[11px] font-semibold text-emerald-700">
                  選択中 — この企画で動画を作ります
                </p>
              )}
            </button>
          );
        })}
      </div>

      {selectedId && (
        <p className="mt-4 text-center text-xs text-gray-500">
          次のステップ：下の「AI動画を作成する」で生成できます
        </p>
      )}
    </div>
  );
}
