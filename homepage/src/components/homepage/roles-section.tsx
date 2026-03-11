import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  ArrowRight,
  Building2,
  Code,
  Database,
  GraduationCap,
  Lightbulb,
  List,
  MessagesSquare,
  University,
} from "lucide-react";

const roles = [
  {
    icon: GraduationCap,
    title: "For Researchers",
    description:
      "PhD students, postdocs, faculty, and independent researchers who want to make their work discoverable, reusable, and properly credited.",
    href: "#",
  },
  {
    icon: University,
    title: "For Research Organizations",
    description:
      "Universities, research institutes, and government agencies that need to preserve knowledge, support their researchers, and demonstrate research excellence.",
    href: "#",
  },
  {
    icon: Building2,
    title: "For Industry",
    description:
      "Companies, R&D teams, and commercial organizations seeking validated research they can actually implement in real-world applications.",
    href: "#",
  },
];

const bricks = [
  { color: "bg-pink-500", icon: List, label: "Methods" },
  { color: "bg-blue-500", icon: Database, label: "Data" },
  { color: "bg-emerald-500", icon: Lightbulb, label: "Claims" },
  { color: "bg-amber-500", icon: Code, label: "Code" },
  { color: "bg-purple-500", icon: MessagesSquare, label: "Discussions" },
];

export function RolesSection() {
  return (
    <section id="roles" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            Your role, your Science Live experience
          </h2>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-3 mb-12">
          {roles.map((role, index) => (
            <Card key={index} className="group shadow-xs flex flex-col">
              <CardContent className="p-4 flex-1 text-center">
                <div className="flex flex-col items-center gap-3 mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                    <role.icon className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl">{role.title}</h3>
                </div>
                <p className="px-4 text-muted-foreground text-md leading-relaxed">
                  {role.description}
                </p>
              </CardContent>
              <CardFooter className="px-8 pb-4 justify-center">
                <a
                  href={role.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Learn more
                  <ArrowRight className="h-4 w-4" />
                </a>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Knowledge Bricks Card */}
        <Card className="shadow-xs">
          <CardContent className="p-8 sm:p-12">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl mb-6">
              Every Research Component Becomes a Knowledge Brick
            </h2>
            <div className="flex flex-wrap justify-center gap-8 py-6">
              {bricks.map((brick, index) => (
                <div key={index} className="flex flex-col items-center gap-3">
                  <div
                    className={`flex flex-col ${brick.color} h-24 w-24 items-center justify-center rounded-lg`}
                  >
                    <brick.icon className="h-8 w-8 text-white mb-2" />
                    <span className="text-sm font-bold text-white">
                      {brick.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <h3 className="text-center font-semibold text-2xl mb-8">
              Create knowledge bricks that others can discover, validate, and
              stack together.
            </h3>
            <p className="text-center text-lg text-muted-foreground mt-6">
              The building blocks of knowledge (and its creators) are given the
              importance they deserve -<br />
              while{" "}
              <span className="font-bold">
                scientific papers are secondary
              </span>{" "}
              and can be generated from the blocks for specific needs, on
              demand.
            </p>
            <p className="text-center text-lg text-muted-foreground mt-6">
              Knowledge bricks are permanently published on the{" "}
              <span className="font-bold">
                decentralized Nanopublications network.
              </span>
            </p>
            <p className="text-center text-lg text-muted-foreground mt-6">
              They can be{" "}
              <span className="font-bold">
                community verified to determine trustworthiness
              </span>
              , rather than solely relying on central authorities.
            </p>
            <p className="text-center text-lg text-muted-foreground mt-6">
              Industry can incentivize{" "}
              <span className="font-bold">
                trustworthy independent research in topics they value.
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
