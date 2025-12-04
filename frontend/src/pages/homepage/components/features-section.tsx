"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CardDecorator } from "@/components/ui/card-decorator";
import {
  BookOpen,
  ChartBar,
  Pen,
  Search,
  Trophy,
  Workflow,
} from "lucide-react";

const values = [
  {
    icon: BookOpen,
    title: "View Knowledge Bricks",
    description:
      "Beautiful, interactive display of scientific nanopublications with automatic template fetching.",
  },
  {
    icon: Pen,
    title: "Create Knowledge Bricks",
    description:
      "Transform research findings into FAIR nanopublications using intuitive templates.",
  },
  {
    icon: Workflow,
    title: "Connect Research",
    description:
      "Link findings across studies, creating a connected knowledge graph.",
  },
  {
    icon: Trophy,
    title: "Get Credit",
    description:
      "Proper attribution and credit for every contribution through ORCID integration.",
  },
  {
    icon: Search,
    title: "Discover Knowledge",
    description:
      "PSearch and find relevant nanopublications across the scientific community.",
  },
  {
    icon: ChartBar,
    title: "Analyze Impact",
    description:
      "Track how your knowledge bricks are used and built upon by others.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            Key Features
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Built for Open Science.
          </p>
        </div>

        {/* Modern Values Grid with Enhanced Design */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3 mb-12">
          {values.map((value, index) => (
            <Card key={index} className="group shadow-xs py-1">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center">
                  <CardDecorator>
                    <value.icon className="h-12 w-12" aria-hidden />
                  </CardDecorator>
                  <h3 className="mt-2 font-medium text-balance text-xl">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground mt-3 text-md">
                    {value.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
