"use client";

import Link from "next/link";
import { BRAND_NAME, FOOTER_COPYRIGHT, FOOTER_LINKS, FOOTER_TAGLINE } from "@/lib/landing/copy";

export function SiteFooter() {
  const mainLinks = FOOTER_LINKS.main;
  const legalLinks = FOOTER_LINKS.legal.filter((link) => {
    if (link.href.startsWith("mailto:")) return !link.href.endsWith(".example");
    return true;
  });

  return (
    <footer className="border-t border-white/10 bg-black px-5 sm:px-8">
      <div className="mx-auto max-w-7xl py-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-[1fr_auto]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-3 text-sm font-bold tracking-[.22em] text-white">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[10px] font-black text-black">Z</span>
              {BRAND_NAME}
            </Link>
            <p className="mt-4 text-sm leading-7 text-white/40">{FOOTER_TAGLINE}</p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:gap-14">
            <nav aria-label="サイトナビゲーション">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[.22em] text-white/30">Explore</p>
              <ul className="space-y-3">
                {mainLinks.map((link) => <li key={link.href}><Link href={link.href} className="text-sm text-white/55 transition hover:text-[#d7ff43]">{link.label}</Link></li>)}
              </ul>
            </nav>
            <nav aria-label="法務・お問い合わせ">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[.22em] text-white/30">Information</p>
              <ul className="space-y-3">
                {legalLinks.map((link) => <li key={link.href}>{link.href.startsWith("mailto:") ? <a href={link.href} className="text-sm text-white/55 transition hover:text-[#d7ff43]">{link.label}</a> : <Link href={link.href} className="text-sm text-white/55 transition hover:text-[#d7ff43]">{link.label}</Link>}</li>)}
              </ul>
            </nav>
          </div>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-3 border-t border-white/10 pt-5 text-[10px] text-white/30 sm:flex-row">
          <span>{FOOTER_COPYRIGHT}</span>
          <span className="font-mono tracking-[.16em]">AI VIDEO STUDIO / JAPAN</span>
        </div>
      </div>
    </footer>
  );
}
