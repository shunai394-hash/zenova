"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BRAND_NAME, NAV_LINKS } from "@/lib/landing/copy";
import { AuthAccountStatus } from "@/components/auth-account-status";

function loginNextFromPath(pathname: string | null): string {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return "/analyze";
  }
  if (pathname === "/login" || pathname.startsWith("/auth/")) {
    return "/analyze";
  }
  return pathname;
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const loginNext = loginNextFromPath(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900/80 bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          aria-label={`${BRAND_NAME} ホーム`} className="shrink-0 rounded px-1 py-2 text-sm font-semibold tracking-[0.18em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {BRAND_NAME}
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-gray-400 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={`rounded px-2 py-2 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${pathname === link.href ? "text-white" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <AuthAccountStatus loginNext={loginNext} />
        </div>

        <button
          type="button"
          className="min-h-11 rounded-lg border border-zinc-700 px-3 text-xs text-gray-300 transition hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:hidden"
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
            <AuthAccountStatus loginNext={loginNext} />
          </div>
          <ul className="space-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2.5 text-sm text-gray-200 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${pathname === link.href ? "bg-zinc-900 text-white" : ""}`}
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
