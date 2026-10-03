import Link from "next/link";
import { CTA_CREATE_VIDEO } from "@/lib/landing/copy";

export function LandingBottomCta() {
  return (
    <section className="border-t border-zinc-900 px-4 py-20 sm:px-6 sm:py-24">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] via-zinc-950 to-cyan-400/[0.05] px-6 py-12 text-center sm:px-10 sm:py-16">
        <div aria-hidden className="absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/70">Start with one outcome</p>
          <h2 className="mt-4 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
            「何を作ればいい？」から、
            <br />
            「これを使おう」まで。
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
            目的を選び、生成し、完成映像を見直す。改善点は次の生成につながります。
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#hero" className="inline-flex min-h-12 items-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-zinc-200">
              {CTA_CREATE_VIDEO}
            </a>
            <Link href="/video" className="inline-flex min-h-12 items-center rounded-xl border border-white/15 px-6 py-3 text-sm text-zinc-200 transition hover:bg-white/[0.06]">
              AI Video Studioを見る
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
