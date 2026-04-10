import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import {
  ArrowRight,
  MessageCircleCheck,
  PenTool,
  Rss,
  Search,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export function Home() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  return (
    <main className="container mx-auto flex grow flex-col gap-12 p-4 md:p-6 md:max-w-4xl">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Science <span className="text-primary">Live</span>{" "}
          <span className="text-muted-foreground text-xl align-middle">
            Platform
          </span>{" "}
          <Badge variant="secondary" className="ml-2 text-sm align-top">
            Beta
          </Badge>
        </h1>
        <p className="mx-auto max-w-lg text-lg text-muted-foreground">
          Transform research into structured, citable nanopublications
        </p>
        {!session?.user && (
          <Button
            size="lg"
            className="mt-4 cursor-pointer"
            onClick={() => navigate("/auth/sign-in")}
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </section>

      {/* Action Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Link to="/np/" className="group">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <Rss className="h-5 w-5 text-primary mb-2" />
              <CardTitle className="text-base">Browse</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Explore the latest nanopublications from the community
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/np/create" className="group">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <PenTool className="h-5 w-5 text-primary mb-2" />
              <CardTitle className="text-base">Create</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Publish FAIR nanopublications from your research
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/np/" className="group">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <Search className="h-5 w-5 text-primary mb-2" />
              <CardTitle className="text-base">Search</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Find nanopublications by keyword, AI query, or location
              </p>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Feedback */}
      <section>
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircleCheck className="h-4 w-4 text-primary" />
              Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Post an issue on{" "}
              <a
                href="https://github.com/ScienceLiveHub/science-live-platform"
                className="text-primary hover:underline"
                target="_blank"
              >
                GitHub
              </a>
              ,{" "}
              <a
                href="mailto:contact@vitenhub.no"
                className="text-primary hover:underline"
              >
                email us
              </a>
              , or{" "}
              <a
                href="https://calendly.com/anne-fouilloux/30min"
                className="text-primary hover:underline"
                target="_blank"
              >
                book a call
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
