import Link from "next/link";
import { CTA_CREATE_VIDEO } from "@/lib/landing/copy";

export function LandingBottomCta() {
  return (
    <section className="border-t border-zinc-900 px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-10 text-center">
        <h2 className="text-xl font-bold sm:text-2xl">
          まずは1本、作ってみましょう
        </h2>
        <p className="mt-3 text-sm text-gray-400">
          URLを貼るだけで始められます。売れてる商品を探すこともできます。
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#hero"
            className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-gray-100"
          >
            {CTA_CREATE_VIDEO}
          </a>
          <Link
            href="/products"
            className="inline-flex rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-gray-200 hover:bg-zinc-800"
          >
            売れてる商品を見る
          </Link>
        </div>
      </div>
    </section>
  );
}
