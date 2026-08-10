"use client";

/** AI分析の文章説明 */
export function AnalysisNarrative({ text }: { text: string }) {
  if (!text.trim()) return null;

  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      <h3 className="text-base font-semibold text-white">AI分析の説明</h3>
      <p className="mt-1 text-xs text-gray-500">
        なぜこの企画・構成になったかを文章でまとめます
      </p>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-300">
        {text.split("\n\n").map((para) => (
          <p key={para.slice(0, 24)}>{para}</p>
        ))}
      </div>
    </div>
  );
}
