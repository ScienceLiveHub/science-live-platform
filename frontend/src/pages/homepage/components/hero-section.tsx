"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-background/80 pt-20 sm:pt-32 pb-16">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        {/* Dot pattern overlay using reusable component */}
        {/* <DotPattern className="opacity-100" size="md" fadeStyle="ellipse" /> */}
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="mx-auto max-w-4xl text-center">
          {/* Announcement Badge */}
          <div className="mb-8 flex justify-center">
            {/* <Badge variant="outline" className="px-4 py-2 border-foreground">
              <Star className="w-3 h-3 mr-2 fill-current" />
              New: Premium Template Collection
              <ArrowRight className="w-3 h-3 ml-2" />
            </Badge> */}
          </div>

          {/* Main Headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Transform research into
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {" "}
              connected knowledge{" "}
            </span>
            through stackable knowledge bricks
          </h1>

          {/* Subheading */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Making scientific work FAIR: Findable, Accessible, Interoperable,
            Reusable.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="text-base cursor-pointer" asChild>
              <a href="https://github.com/ScienceLiveHub">
                Documentation
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base cursor-pointer"
              asChild
            >
              <a href="test-nanopub">
                <i className="fas fa-puzzle-piece"></i>
                Zotero Plugin
              </a>
            </Button>
          </div>
          <p className="mx-auto m-10 max-w-xl text-lg text-muted-foreground sm:text-l italic">
            <i className="fas fa-flask mr-4"></i>
            Knowledge bricks web interface coming soon.
          </p>
        </div>
      </div>
    </section>
  );
}
