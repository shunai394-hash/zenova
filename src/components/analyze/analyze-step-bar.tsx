import {
  ANALYZE_WORKSPACE_STEPS,
  type AnalyzeWorkspaceStepKey,
} from "@/lib/analyze/workspace";

export function AnalyzeStepBar({
  current,
}: {
  current: AnalyzeWorkspaceStepKey;
}) {
  const currentIndex = ANALYZE_WORKSPACE_STEPS.findIndex(
    (s) => s.key === current
  );
  const progressPct =
    currentIndex <= 0
      ? 12
      : Math.round(((currentIndex + 0.5) / ANALYZE_WORKSPACE_STEPS.length) * 100);

  return (
    <div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${Math.min(100, progressPct)}%` }}
        />
      </div>
      <ol className="grid grid-cols-4 gap-1 sm:gap-2">
        {ANALYZE_WORKSPACE_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li
              key={step.key}
              className={`min-w-0 rounded-lg border px-1 py-2 text-center sm:rounded-xl sm:px-2 sm:py-3 ${
                active
                  ? "border-white bg-white text-black"
                  : done
                    ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-100"
                    : "border-zinc-800 bg-zinc-950 text-gray-500"
              }`}
            >
              <p className="text-[9px] font-medium tracking-wide opacity-70 sm:text-[10px]">
                STEP {step.id}
              </p>
              <p className="mt-1 truncate text-[10px] font-semibold leading-tight sm:text-sm">
                {step.label}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
