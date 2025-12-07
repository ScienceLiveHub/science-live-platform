import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl text-muted-foreground">VIEW NANOPUBLICATION</h1>
        <div className="flex gap-2 w-full md:w-auto">
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
      </div>
      Load a URI above, or try an example:{" "}
      <NavLink
        to={"/np/RA6Cz33icPZrBAummwxw6MwdS-RepX-sUjW_fZz905Rvc"}
        className="text-purple-500 hover:underline"
      >
        includes quotation from cvpr.2009.5206848
      </NavLink>
      <NavLink
        to="/np/RAuoXvJWbbzZsFslswYaajgjeEl-040X6SCQFXHfVtjf0#Garfield"
        className="text-purple-500 hover:underline"
      >
        Garfield
      </NavLink>
      <NavLink
        to="/np/RAZMzeEoutrEi1xEpf5XSrSpMnvwTONYzMat5TkIqUWY8"
        className="text-purple-500 hover:underline"
      >
        Garfield is a fictional character
      </NavLink>
      <div className="mt-10 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl text-muted-foreground">
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
    </main>
  );
}
