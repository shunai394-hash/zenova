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
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#070709]/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="group shrink-0 rounded px-1 py-2 text-sm font-semibold tracking-[0.22em] text-white"
        >
          {BRAND_NAME}
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.025] p-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-[12px] transition hover:bg-white/[0.07] hover:text-white"
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
          className="min-h-11 rounded-lg border border-zinc-700 px-3 text-xs text-gray-300 transition hover:border-zinc-500 md:hidden"
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
