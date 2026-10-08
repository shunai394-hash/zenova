"use client";

import {
  VIDEO_BGM_OPTIONS,
  VIDEO_DURATION_OPTIONS,
  VIDEO_SPEAKER_OPTIONS,
  VIDEO_STYLE_OPTIONS,
  getBgmLabel,
  getSpeakerLabel,
  getVideoStyleLabel,
  type VideoSettings,
  type VideoBgmId,
  type VideoDurationSec,
  type VideoSpeakerId,
  type VideoStyleId,
} from "@/lib/analyze/video-settings";
import type { RecommendedVideoSettings } from "@/lib/analyze/recommend-settings";
import { toVideoSettings } from "@/lib/analyze/recommend-settings";
import { getStyleVideoTemplate } from "@/lib/analyze/style-templates";

/** BGM合成は未実装。UI上は「開発中」を明示する。 */
export const BGM_FEATURE_STATUS = "開発中" as const;

function OptionGroup<T extends string | number>({
  label,
  options,
  value,
  disabled,
  onChange,
  badge,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  disabled?: boolean;
  onChange: (next: T) => void;
  badge?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <p className="text-sm font-medium text-gray-300">{label}</p>
        {badge && (
          <span className="rounded bg-amber-950/60 px-2 py-0.5 text-[10px] font-medium text-amber-300">
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={String(opt.id)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={`rounded-xl border px-3 py-2 text-sm transition disabled:opacity-40 ${
                active
                  ? "border-white bg-white text-black"
                  : "border-zinc-700 bg-zinc-950 text-gray-300 hover:border-zinc-500"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 初心者向け：動画タイプ選択（説明文付き） */
function VideoTypeSelector({
  value,
  disabled,
  onChange,
}: {
  value: VideoStyleId;
  disabled?: boolean;
  onChange: (id: VideoStyleId) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-300">動画タイプ</p>
      <p className="mt-1 text-xs text-gray-500">
        作りたい動画の雰囲気を選んでください（初心者はUGCか商品レビューがおすすめ）
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {VIDEO_STYLE_OPTIONS.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={`rounded-xl border p-3.5 text-left transition disabled:opacity-40 ${
                active
                  ? "border-white bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
                  : "border-zinc-700 bg-zinc-950 text-gray-300 hover:border-zinc-500"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>
                  {opt.icon}
                </span>
                <span className="text-sm font-semibold">{opt.label}</span>
              </span>
              <span
                className={`mt-2 block text-xs leading-relaxed ${
                  active ? "text-zinc-600" : "text-gray-500"
                }`}
              >
                {opt.description}
              </span>
              <span
                className={`mt-2 block text-[11px] ${
                  active ? "text-zinc-500" : "text-gray-600"
                }`}
              >
                向いている商品: {opt.suitableProducts}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VideoSettingsPanel({
  settings,
  onChange,
  disabled,
  recommendation,
}: {
  settings: VideoSettings;
  onChange: (next: VideoSettings) => void;
  disabled?: boolean;
  recommendation?: RecommendedVideoSettings | null;
}) {
  const patch = <K extends keyof VideoSettings>(
    key: K,
    value: VideoSettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  const tmpl = getStyleVideoTemplate(settings.video_style);

  return (
    <div
      id="video-settings"
      className="scroll-mt-24 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
          3
        </span>
        <h2 className="text-lg font-semibold">動画設定パネル</h2>
      </div>
      <p className="mt-2 text-sm text-gray-400">
        動画タイプ・尺・話者・字幕・BGMを選んでから生成します
      </p>

      {recommendation && (
        <div className="mt-5 rounded-xl border border-zinc-700 bg-black/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">
                AIおすすめ設定
              </p>
              <p className="mt-1 text-xs text-gray-500">
                分析結果から自動提案しています。ワンクリックで反映できます。
              </p>
              <p className="mt-3 text-sm text-gray-300">
                {getVideoStyleLabel(recommendation.video_style)} /{" "}
                {recommendation.duration_sec}秒 /{" "}
                {getSpeakerLabel(recommendation.speaker)} / 字幕
                {recommendation.captions_enabled ? "ON" : "OFF"} / BGM{" "}
                {getBgmLabel(recommendation.bgm)}
                <span className="ml-1 text-amber-300">
                  （{BGM_FEATURE_STATUS}）
                </span>
              </p>
              <ul className="mt-2 space-y-1 text-xs text-gray-500">
                {recommendation.reasons.map((reason) => (
                  <li key={reason}>・{reason}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(toVideoSettings(recommendation))}
              className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-gray-100 disabled:opacity-40"
            >
              おすすめ設定を適用
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-6">
        <VideoTypeSelector
          value={settings.video_style}
          disabled={disabled}
          onChange={(id) => patch("video_style", id)}
        />

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
          <p className="text-xs font-medium text-gray-400">
            選んだタイプ: {tmpl.nameJa}
          </p>
          <p className="mt-2 text-sm text-gray-300">{tmpl.scriptOutline}</p>
          <p className="mt-2 text-xs text-gray-500">
            フック: {tmpl.hookStyle} ／ CTA: {tmpl.ctaStyle}
          </p>
        </div>

        <OptionGroup
          label="尺"
          options={VIDEO_DURATION_OPTIONS}
          value={settings.duration_sec}
          disabled={disabled}
          onChange={(id) => patch("duration_sec", id as VideoDurationSec)}
        />

        <OptionGroup
          label="話者"
          options={VIDEO_SPEAKER_OPTIONS}
          value={settings.speaker}
          disabled={disabled}
          onChange={(id) => patch("speaker", id as VideoSpeakerId)}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-gray-300">字幕</p>
          <div className="flex flex-wrap gap-2">
            {[true, false].map((on) => (
              <button
                key={String(on)}
                type="button"
                disabled={disabled}
                onClick={() => patch("captions_enabled", on)}
                className={`rounded-xl border px-3 py-2 text-sm transition disabled:opacity-40 ${
                  settings.captions_enabled === on
                    ? "border-white bg-white text-black"
                    : "border-zinc-700 bg-zinc-950 text-gray-300 hover:border-zinc-500"
                }`}
              >
                {on ? "ON" : "OFF"}
              </button>
            ))}
          </div>
        </div>

        <OptionGroup
          label="BGM"
          options={VIDEO_BGM_OPTIONS}
          value={settings.bgm}
          disabled={disabled}
          onChange={(id) => patch("bgm", id as VideoBgmId)}
          badge={BGM_FEATURE_STATUS}
        />
      </div>
    </div>
  );
}
