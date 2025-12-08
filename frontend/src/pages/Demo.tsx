import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, FileCode, FlaskConical } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AboutSection } from "./homepage/components/about-section";

/**
 * Demo
 *
 * - Simple Demo links
 */

export default function Demo() {
  const navigate = useNavigate();

  const [inputUri, setInputUri] = useState("");

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-6xl">
      <div className="mt-10 mb-10">
        <h1 className="text-xl text-muted-foreground font-bold mb-10 flex">
          <FlaskConical className="mr-4" /> Work in Progress demo
        </h1>
        <h1 className="text-xl text-muted-foreground mb-10">
          An early demonstration of Science Live's core capability: making
          scientific knowledge FAIR (Findable, Accessible, Interoperable,
          Reusable).
        </h1>
      </div>
      <Card className="mb-10">
        <CardContent>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="mb-10 text-xl text-muted-foreground font-black">
              VIEW NANOPUBLICATION
            </h1>
          </div>
          <div className="flex mb-10 gap-2 w-full md:w-auto">
            <Input
              type="text"
              className="flex-1 md:w-[520px]"
              placeholder="Enter URI e.g. https://w3id.org/np/... or http://purl.org/nanopub/..."
              value={inputUri}
              onChange={(e) => setInputUri(e.target.value)}
            />
            <Button
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              onClick={(e) => {
                e.preventDefault();
                navigate("/np/" + encodeURIComponent(inputUri));
              }}
            >
              Load
            </Button>
          </div>
          <div className="mt-10 mb-4 gap-2 w-full md:w-auto">
            Load a URI above, or try an example:
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <FileCode className="h-4 w-4 mt-1 text-purple-600 dark:text-purple-400" />
                <NavLink
                  to={"/np/RA6Cz33icPZrBAummwxw6MwdS-RepX-sUjW_fZz905Rvc"}
                  className="text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Quoting or commenting on a paper
                </NavLink>
              </li>
              <li className="flex items-start gap-2">
                <FileCode className="h-4 w-4 mt-1 text-purple-600 dark:text-purple-400" />
                <NavLink
                  to="/np/RAuoXvJWbbzZsFslswYaajgjeEl-040X6SCQFXHfVtjf0#Garfield"
                  className="text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Defining a subject: Garfield
                </NavLink>
              </li>
              <li className="flex items-start gap-2">
                <FileCode className="h-4 w-4 mt-1 text-purple-600 dark:text-purple-400" />
                <NavLink
                  to="/np/RAZMzeEoutrEi1xEpf5XSrSpMnvwTONYzMat5TkIqUWY8"
                  className="text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Stating a fact about a subject: Garfield is a fictional
                  character
                </NavLink>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="mb-10 text-xl text-muted-foreground font-black">
              CREATE NANOPUBLICATION
            </h1>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button size="lg" className="text-base cursor-pointer" asChild>
              <Link to="/np/create">
                Nanopub Creator demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="mt-20">
        <h1 className="text-xl text-muted-foreground font-black">
          WHAT IS A NANOPUBLICATION?
        </h1>
        <AboutSection hideTitle />
      </div>
    </main>
  );
}
