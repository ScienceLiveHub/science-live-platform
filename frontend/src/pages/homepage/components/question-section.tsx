"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, File, Microscope, UserCircle } from "lucide-react";

const items = [
  {
    label: "Structured:",
    text: "Clear assertion, provenance, and publication info",
  },
  {
    label: "Linked:",
    text: "Connected to other knowledge using standard vocabularies",
  },
  {
    label: "Attributed:",
    text: "Properly credited to its creator",
  },
  {
    label: "Verifiable:",
    text: "Cryptographically signed and trustworthy",
  },
  {
    label: "Permanent:",
    text: "Immutable and permanently accessible",
  },
];

export function QuestionSection() {
  return (
    <section id="contact" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Contact Form */}
          <div className="lg:col-span-1 order-1 lg:order-1">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              What are Nanopublications?
            </h2>
            <h3 className="mb-4">
              Nanopublications are the smallest units of publishable
              information. Each nanopublication is:
            </h3>
            <ul role="list" className="space-y-3 text-sm">
              {items.map((feature) => (
                <li className="flex items-center gap-3">
                  <Check
                    className="text-muted-foreground size-4 flex-shrink-0"
                    strokeWidth={2.5}
                  />
                  <span>
                    <strong>{feature.label}</strong> {feature.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Options */}
          <div className="space-y-6 order-2 lg:order-2">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <File className="h-5 w-5 text-primary" />
                  Assertion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  The actual claim or statement.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Microscope className="h-5 w-5 text-primary" />
                  Provenance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  Where did this come from?
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-primary" />
                  Publication Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  Who, when, and how?
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
