import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Coins,
  Eye,
  FileStack,
  List,
  MessageCircleCheck,
  Rss,
  Search,
  Sparkles,
  TrendingUp,
  University,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export function Home() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/auth/sign-in");
  };

  return (
    <main className="container mx-auto flex grow flex-col gap-8 p-4 md:p-6 md:max-w-6xl">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center gap-6 py-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Science <span className="font-bold  text-primary">Live</span>{" "}
          <span className="text-muted-foreground text-xl align-middle">
            Platform
          </span>{" "}
          <Badge variant="secondary" className="ml-2 text-sm align-top">
            Beta
          </Badge>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
          View, Create and Explore the building blocks of knowledge
        </p>
        {!session?.user && (
          <Button
            size="lg"
            className="mt-4 text-base cursor-pointer"
            onClick={handleGetStarted}
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </section>

      {/* Featured Nanopublications Section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold">Featured Nanopublications</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Placeholder cards for Featured nanopubs
          {[1, 2, 3].map((i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  Nanopublication {i}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  A brief description of this nanopublication and its
                  significance in the research community.
                </p>
              </CardContent>
            </Card>
          ))} */}
          Coming soon...
        </div>
      </section>

      {/* Popular Topics Section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <List className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold">Popular Topics</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            "Machine Vision",
            "Artificial Intelligence",
            "Climate",
            "Quantum Computing",
            "Nanotechnology",
            "Renewable Energy",
            "Drug Discovery",
            "Biodiversity",
          ].map((topic) => (
            <Link to={`/np/?q=${topic}`}>
              <Button
                key={topic}
                variant="outline"
                size="sm"
                className="cursor-pointer"
              >
                {topic}
              </Button>
            </Link>
          ))}
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="flex flex-col gap-4">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <List className="h-4 w-4 mt-1" />
                Browse by topics
              </li>
              <li className="flex items-start gap-2">
                <Search className="h-4 w-4 mt-1" />
                Full search
              </li>
              <li className="flex items-start gap-2">
                <FileStack className="h-4 w-4 mt-1" />
                Create collections
              </li>
              <li className="flex items-start gap-2">
                <Rss className="h-4 w-4 mt-1" />
                Feeds - follow and subscribe
              </li>
              <li className="flex items-start gap-2">
                <BadgeCheck className="h-4 w-4 mt-1" />
                Community verification - trustworthiness ratings for
                nanopublications
              </li>
              <li className="flex items-start gap-2">
                <Coins className="h-4 w-4 mt-1" />
                Credit system - Rewards for publishers
              </li>
              <li className="flex items-start gap-2">
                <University className="h-4 w-4 mt-1" />
                Research Organizations - Attribute research to orgs
              </li>
              <li className="flex items-start gap-2">
                <Building2 className="h-4 w-4 mt-1" />
                Industry - Post requests and bounties on research topics
              </li>
              <li className="flex items-start gap-2">
                <Eye className="h-4 w-4 mt-1" />
                Systematic Review
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 mt-1" />
                Generate papers from verified knowledge graph
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
      {/* Feedback Section */}
      <section className="flex flex-col gap-4">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageCircleCheck className="h-5 w-5 text-primary" />
              Feedback and Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Post an issue on{" "}
              <a
                href="https://github.com/ScienceLiveHub/science-live-platform"
                className="text-primary"
                target="_blank"
              >
                Github
              </a>{" "}
              or{" "}
              <a
                href="mailto:contact@sciencelive4all.org"
                className="text-primary"
              >
                Email us
              </a>
              .
            </p>
            <p>
              To discuss in detail, book a{" "}
              <a
                href="https://calendly.com/anne-fouilloux/30min"
                className="text-primary"
                target="_blank"
              >
                Video call
              </a>
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
