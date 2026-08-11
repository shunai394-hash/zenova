"use client";

import Link from "next/link";
import { useState } from "react";
import { BRAND_NAME, NAV_LINKS } from "@/lib/landing/copy";
import { AuthAccountStatus } from "@/components/auth-account-status";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900/80 bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-sm font-semibold tracking-[0.18em] text-white"
        >
          {BRAND_NAME}
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-gray-400 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <AuthAccountStatus />
        </div>

        <button
          type="button"
          className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-gray-300 md:hidden"
          aria-expanded={open}
          aria-label="メニュー"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "閉じる" : "メニュー"}
        </button>
      </div>

      {open && (
        <nav className="border-t border-zinc-900 px-4 py-3 md:hidden">
          <div className="mb-3 border-b border-zinc-900 pb-3">
            <AuthAccountStatus />
          </div>
          <ul className="space-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-lg px-3 py-2.5 text-sm text-gray-200 hover:bg-zinc-900"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
