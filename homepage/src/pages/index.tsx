import type { HeadFC, PageProps } from "gatsby";
import * as React from "react";
import { AboutSection } from "../components/homepage/about-section";
import { LandingFooter } from "../components/homepage/footer";
import { HeroSection } from "../components/homepage/hero-section";
import { Navbar } from "../components/homepage/navbar";
import { RolesSection } from "../components/homepage/roles-section";
import { TeamSection } from "../components/homepage/team-section";

const IndexPage: React.FC<PageProps> = () => {
  return (
    <div>
      <Navbar />
      <HeroSection />
      <RolesSection />
      <AboutSection />
      <TeamSection />
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
