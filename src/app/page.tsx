import { LandingAudienceCards } from "@/components/landing/landing-audience";
import { LandingBottomCta } from "@/components/landing/landing-bottom-cta";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingReasons } from "@/components/landing/landing-reasons";
import { LandingSampleVideos } from "@/components/landing/landing-samples";
import { LandingSteps } from "@/components/landing/landing-steps";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeader />
      <LandingHero />
      <LandingSteps />
      <LandingSampleVideos />
      <LandingAudienceCards />
      <LandingBottomCta />
      <LandingReasons />
      <LandingFaq />
      <SiteFooter />
    </main>
  );
}
