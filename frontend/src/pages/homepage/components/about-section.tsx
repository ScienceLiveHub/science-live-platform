"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, File, FileInput, Microscope, UserCircle } from "lucide-react";
import { NavLink } from "react-router-dom";

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

export function AboutSection({ hideTitle }: { hideTitle?: boolean }) {
  return (
    <section id="about" className="py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Info */}
          <div className="lg:col-span-1 order-1 lg:order-1">
            {!hideTitle && (
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                What are Nanopublications?
              </h2>
            )}
            {/* <h3 className="mb-4"> */}
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Nanopublications are the smallest units of publishable
              information. <br /> Each nanopublication is:
            </p>
            <ul role="list" className="space-y-3">
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

          {/* Side boxes */}
          <div className="space-y-6 order-2 lg:order-2">
            <Card className="hover:shadow-md transition-shadow m-0 border-l-8 border-l-yellow-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <File className="h-5 w-5 text-primary" />
                  Assertion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-1">
                  The actual claim or statement.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow m-0 border-l-8 border-l-purple-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Microscope className="h-5 w-5 text-primary" />
                  Provenance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-1">
                  Where did this come from?
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow m-0 border-l-8 border-l-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-primary" />
                  Publication Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-1">
                  Who, when, and how?
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        {!hideTitle && (
          <div className="flex items-center">
            <FileInput className="mr-2" /> Example nanopublication:
            <NavLink
              to="/np/?uri=https://w3id.org/np/RAuoXvJWbbzZsFslswYaajgjeEl-040X6SCQFXHfVtjf0#Garfield"
              className="text-purple-500 hover:underline ml-3"
            >
              Garfield
            </NavLink>
          </div>
        )}
      </div>
    </section>
  );
}
