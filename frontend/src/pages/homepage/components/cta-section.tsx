"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, FlaskConical } from "lucide-react";

export function CtaSection() {
  return (
    <section id="cta-bottom" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            Ready to Transform Your Research?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start creating FAIR knowledge bricks today
          </p>
        </div>

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
            <a href="np">
              <FlaskConical />
              Try Demo
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
