"use client";

import { useState } from "react";
import { FAQ_ITEMS, FAQ_SECTION_TITLE } from "@/lib/landing/faq";

export function LandingFaq() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          {FAQ_SECTION_TITLE}
        </h2>

        <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          {FAQ_ITEMS.map((item, index) => {
            const open = openId === item.id;
            return (
              <div
                key={item.id}
                className={
                  index > 0 ? "border-t border-zinc-800" : undefined
                }
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`faq-panel-${item.id}`}
                  id={`faq-button-${item.id}`}
                  onClick={() =>
                    setOpenId((current) =>
                      current === item.id ? null : item.id
                    )
                  }
                  className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-800/50 sm:px-6 sm:py-5"
                >
                  <span className="text-sm font-medium text-white sm:text-base">
                    {item.question}
                  </span>
                  <span
                    className="mt-0.5 shrink-0 text-lg leading-none text-gray-400"
                    aria-hidden
                  >
                    {open ? "×" : "＋"}
                  </span>
                </button>
                {open && (
                  <div
                    id={`faq-panel-${item.id}`}
                    role="region"
                    aria-labelledby={`faq-button-${item.id}`}
                    className="px-5 pb-5 sm:px-6 sm:pb-6"
                  >
                    <p className="whitespace-pre-line text-sm leading-relaxed text-gray-400">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
