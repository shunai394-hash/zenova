import {
  AUDIENCE_CARDS,
  AUDIENCE_SECTION_TITLE,
} from "@/lib/landing/copy";

export function LandingAudienceCards() {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          {AUDIENCE_SECTION_TITLE}
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {AUDIENCE_CARDS.map((card) => (
            <article
              key={card.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <p className="text-2xl" aria-hidden>
                {card.icon}
              </p>
              <h3 className="mt-3 text-base font-semibold">{card.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                {card.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
