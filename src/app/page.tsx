import { redirect } from "next/navigation";

import { LandingAudienceCards } from "@/components/landing/landing-audience";
import { LandingBottomCta } from "@/components/landing/landing-bottom-cta";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingReasons } from "@/components/landing/landing-reasons";
import { LandingSampleVideos } from "@/components/landing/landing-samples";
import { LandingSteps } from "@/components/landing/landing-steps";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/site-header";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string }>;
}) {
  const params = await searchParams;

  if (params.code) {
    const next =
      params.next &&
      params.next.startsWith("/") &&
      !params.next.startsWith("//")
        ? params.next
        : "/analyze";

    redirect(
      `/auth/callback?code=${encodeURIComponent(params.code)}&next=${encodeURIComponent(next)}`
    );
  }

  return (
    <main id="main-content" className="min-h-screen bg-black text-white">
      <a
        href="#hero"
        className="sr-only z-[100] rounded-md bg-white px-4 py-3 text-sm font-semibold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        メインコンテンツへ移動
      </a>
      <SiteHeader />
      <LandingHero />
      <LandingSteps />
      <LandingSampleVideos />
      <LandingAudienceCards />
      <LandingReasons />
      <LandingFaq />
      <LandingBottomCta />
      <SiteFooter />
    </main>
  );
}
