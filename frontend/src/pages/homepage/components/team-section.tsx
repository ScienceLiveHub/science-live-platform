"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardDecorator } from "@/components/ui/card-decorator";
import { GitHubIcon, LinkedInIcon } from "@daveyplate/better-auth-ui";
import { Globe } from "lucide-react";

const team = [
  {
    id: 1,
    name: "Anne Fouilloux",
    role: "Project Lead",
    description: "VitenHub AS",
    image: "https://avatars.githubusercontent.com/u/8168508?v=4",
    fallback: "AF",
    social: {
      linkedin: "https://www.linkedin.com/in/annefouilloux/",
      github: "https://github.com/annefou",
    },
  },
  {
    id: 2,
    name: "Knowledge Pixels + Prophet Town",
    role: "Technical Architecture and Platform",
    description: "",
    image: "",
    fallback: "KP / PT",
    social: {
      website: "https://knowledgepixels.com/",
      website2: "https://ptown.tech/",
    },
  },
  {
    id: 3,
    name: "Barbara Magagna",
    role: "Semantic Consulting",
    description: "Mabablue",
    image: "https://avatars.githubusercontent.com/u/32859932?v=4",
    fallback: "BM",
    social: {
      website: "https://mabablue.com/",
      linkedin: "https://www.linkedin.com/in/barbara-magagna-2794ba42/",
      github: "https://github.com/mabablue",
    },
  },
  {
    id: 4,
    name: "Astera Institute",
    role: "Funding",
    description: "Supporting Open Science.",
    image: "https://avatars.githubusercontent.com/u/94918055?s=200&v=4",
    fallback: "AI",
    social: {
      website: "https://astera.org/",
    },
  },
];

export function TeamSection() {
  return (
    <section id="team" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            Team & Partners
          </h2>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
          {team.map((member) => (
            <Card key={member.id} className="shadow-xs py-2">
              <CardContent className="p-4">
                <div className="text-center">
                  {/* Avatar */}
                  <div className="flex justify-center mb-4">
                    <CardDecorator>
                      <Avatar className="h-24 w-24 border shadow-lg">
                        <AvatarImage
                          src={member.image}
                          alt={member.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-lg font-semibold">
                          {member.fallback}
                        </AvatarFallback>
                      </Avatar>
                    </CardDecorator>
                  </div>

                  {/* Name and Role */}
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {member.name}
                  </h3>
                  <p className="text-sm font-medium text-primary mb-3">
                    {member.role}
                  </p>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {member.description}
                  </p>

                  {/* Social Links */}
                  <div className="flex items-center justify-center gap-3">
                    {member.social.linkedin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer hover:text-primary"
                        asChild
                      >
                        <a
                          href={member.social.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.name} LinkedIn`}
                        >
                          <LinkedInIcon className="h-4 w-4 saturate-0" />
                        </a>
                      </Button>
                    )}
                    {member.social.github && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer hover:text-primary"
                        asChild
                      >
                        <a
                          href={member.social.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.name} GitHub`}
                        >
                          <GitHubIcon className="h-4 w-4 saturate-0" />
                        </a>
                      </Button>
                    )}
                    {member.social.website && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer hover:text-primary"
                        asChild
                      >
                        <a
                          href={member.social.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.name} Website`}
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {member.social.website2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer hover:text-primary"
                        asChild
                      >
                        <a
                          href={member.social.website2}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.name} Website`}
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
