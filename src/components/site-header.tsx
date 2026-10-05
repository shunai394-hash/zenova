"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

function isActiveLink(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const loginNext = loginNextFromPath(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl supports-[backdrop-filter]:bg-black/65">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="shrink-0 rounded px-1 py-2 text-sm font-semibold tracking-[0.18em] text-white outline-none transition-opacity hover:opacity-75 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label={`${BRAND_NAME} home`}
        >
          {BRAND_NAME}
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = isActiveLink(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative rounded px-3 py-2 text-sm outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  active ? "text-white" : "text-zinc-500 hover:text-white",
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-px after:origin-left after:transition-transform",
                  active ? "after:scale-x-100 after:bg-white" : "after:scale-x-0 after:bg-white/60 hover:after:scale-x-100",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <AuthAccountStatus loginNext={loginNext} />
        </div>

        <button
          type="button"
          className="min-h-11 rounded-lg border border-white/10 px-3 text-xs text-zinc-300 outline-none transition hover:border-white/30 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black md:hidden"
          aria-expanded={open}
          aria-controls="mobile-primary-navigation"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "閉じる" : "メニュー"}
        </button>
      </div>

      {open && (
        <nav id="mobile-primary-navigation" aria-label="Mobile navigation" className="border-t border-white/10 bg-black/95 px-4 py-4 md:hidden">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-4 border-b border-white/10 pb-4">
              <AuthAccountStatus loginNext={loginNext} />
            </div>
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => {
                const active = isActiveLink(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "flex min-h-11 items-center justify-between rounded-lg px-3 py-3 text-sm outline-none transition",
                        "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                        active ? "bg-white text-black" : "text-zinc-300 hover:bg-white/5 hover:text-white",
                      ].join(" ")}
                      onClick={() => setOpen(false)}
                    >
                      <span>{link.label}</span>
                      {active && <span aria-hidden className="text-[9px] uppercase tracking-[0.18em]">Current</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      )}
    </header>
  );
}
