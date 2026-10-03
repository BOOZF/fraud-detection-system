import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingPreview } from "@/components/landing/LandingPreview";
import { SuccessCriteria } from "@/components/landing/SuccessCriteria";

export default function LandingPage() {
  return (
    <div className="swiss min-h-svh">
      <LandingHero />
      <LandingPreview />
      <SuccessCriteria />
      <HowItWorks />
      <LandingFooter />
    </div>
  );
}
