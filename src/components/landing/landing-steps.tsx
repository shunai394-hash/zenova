import { STEPS, STEPS_SECTION_TITLE } from "@/lib/landing/copy";

export function LandingSteps() {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          {STEPS_SECTION_TITLE}
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map((item, index) => (
            <article
              key={item.step}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-black">
                {index + 1}
              </div>
              <p className="mt-4 text-xs uppercase tracking-wide text-gray-500">
                {item.step}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
