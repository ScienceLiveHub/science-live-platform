import { Navbar01 } from "@/components/ui/shadcn-io/navbar-01";
import { HeroSection } from "./components/hero-section";
import { FeaturesSection } from "./components/features-section";
import { CtaSection } from "./components/cta-section";
import { LandingFooter } from "./components/footer";
import { AboutSection } from "./components/about-section";
import { TeamSection } from "./components/team-section";

export function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <div className="relative w-full">
        <Navbar01 />
      </div>
      <HeroSection />

      <FeaturesSection />

      <AboutSection />

      <TeamSection />

      <CtaSection />

      <LandingFooter />
    </div>
  );
}
