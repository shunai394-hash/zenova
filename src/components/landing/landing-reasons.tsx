import { REASONS, REASONS_SECTION_TITLE } from "@/lib/landing/copy";

export function LandingReasons() {
  return (
    <section className="border-y border-zinc-900 bg-zinc-950/50 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/70">Why Zenova</p>
          <h2 className="mt-3 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">{REASONS_SECTION_TITLE}</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400 sm:text-base">「AIで動画を作れる」だけでは選ぶ理由にならない。ZENOVAは、作る前の迷いと、作った後のやり直しを減らす。</p>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
          {REASONS.map((card, index) => (
            <article key={card.id} className="bg-zinc-950 p-6 sm:p-7">
              <div className="flex items-center justify-between"><span className="font-mono text-[10px] tracking-[0.2em] text-cyan-300">{card.icon}</span><span className="text-[10px] uppercase tracking-[0.18em] text-zinc-700">Benefit 0{index + 1}</span></div>
              <h3 className="mt-12 text-xl font-medium tracking-tight text-white">{card.title}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
