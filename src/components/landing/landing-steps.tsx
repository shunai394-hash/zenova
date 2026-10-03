import { STEPS, STEPS_SECTION_TITLE } from "@/lib/landing/copy";

export function LandingSteps() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div><p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/70">The loop</p><h2 className="mt-3 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">{STEPS_SECTION_TITLE}</h2></div>
          <p className="max-w-xl justify-self-end text-sm leading-7 text-zinc-400 sm:text-base">1回で完璧を要求するのではなく、結果を見て直す。ZENOVAの価値は「生成」より、その次の改善まで一つにつながっていることです。</p>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
          {STEPS.map((item) => <article key={item.step} className="bg-zinc-950 p-6 sm:p-7"><span className="font-mono text-[10px] tracking-[0.18em] text-cyan-300">{item.step}</span><h3 className="mt-8 text-xl font-medium tracking-tight text-white">{item.title}</h3><p className="mt-3 text-sm leading-7 text-zinc-400">{item.body}</p></article>)}
        </div>
      </div>
    </section>
  );
}
