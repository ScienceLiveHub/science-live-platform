import { AboutSection } from "./components/about-section";
import { CtaSection } from "./components/cta-section";
import { FeaturesSection } from "./components/features-section";
import { LandingFooter } from "./components/footer";
import { HeroSection } from "./components/hero-section";
import { TeamSection } from "./components/team-section";

export function HomePage() {
  return (
    <div>
      <HeroSection />

      <FeaturesSection />

      <AboutSection />

      <TeamSection />

      <CtaSection />

      <LandingFooter />
    </div>
  );
}
