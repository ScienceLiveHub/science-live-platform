import type { HeadFC, PageProps } from "gatsby";
import * as React from "react";
import { AboutSection } from "../components/homepage/about-section";
import { CtaSection } from "../components/homepage/cta-section";
import { FeaturesSection } from "../components/homepage/features-section";
import { LandingFooter } from "../components/homepage/footer";
import { HeroSection } from "../components/homepage/hero-section";
import { TeamSection } from "../components/homepage/team-section";

const IndexPage: React.FC<PageProps> = () => {
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
};

export default IndexPage;

export const Head: HeadFC = () => (
  <>
    <title>Science Live - Connected Knowledge</title>
    <meta
      name="description"
      content="Transform research into connected knowledge through stackable knowledge bricks. Making scientific work FAIR: Findable, Accessible, Interoperable, Reusable."
    />
  </>
);
