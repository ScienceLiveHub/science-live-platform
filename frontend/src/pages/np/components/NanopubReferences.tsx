// ---------------------------------------------------------------------------
// Nanopub References
// ---------------------------------------------------------------------------

import { Spinner } from "@/components/ui/spinner";
import { NANOPUB_REFERENCES } from "@/lib/queries";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_FULL } from "@/lib/sparql";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import { ChevronDown, FileSymlink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SearchResultList, { SearchResult } from "./SearchResultList";

/**
 * An expandable panel that shows all nanopubs that reference the current nanopub.
 * Only queries when expanded to avoid unnecessary API calls.
 */
export function NanopubReferences({ nanopubUri }: { nanopubUri: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [references, setReferences] = useState<SearchResult[]>([]);
  const hasFetched = useRef(false);

  // Fetch references when panel is opened
  useEffect(() => {
    if (!isOpen || hasFetched.current) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const fetchReferences = async () => {
      try {
        const rows = await executeBindSparql(
          NANOPUB_REFERENCES,
          { nanopubUri },
          NANOPUB_SPARQL_ENDPOINT_FULL,
          controller.signal,
        );

        setReferences(
          rows.map((row) => ({
            np: row.np,
            label: row.label || "",
            date: new Date(row.date),
            creator: row.creator || "",
          })),
        );
        hasFetched.current = true;
      } catch (e: any) {
        // Ignore errors from aborted requests
        if (e?.name === "AbortError") {
          return;
        }
        console.error("Failed to fetch references:", e);
        setError(e?.message || "Failed to fetch references");
      } finally {
        setLoading(false);
      }
    };

    fetchReferences();

    return () => {
      controller.abort();
    };
  }, [isOpen, nanopubUri]);

  // Reset fetch state when URI changes
  useEffect(() => {
    hasFetched.current = false;
    setReferences([]);
    setError(null);
  }, [nanopubUri]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="rounded-lg border bg-card"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left font-medium hover:bg-muted/50 transition-colors">
        <span className="flex items-center gap-2">
          <FileSymlink className="h-5 w-5 text-muted-foreground" />
          <span>Referencing Nanopublications</span>
          {!loading && hasFetched.current && (
            <span className="text-sm text-muted-foreground">
              ({references.length})
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        {loading ? (
          <div className="flex items-center gap-3 py-4 text-muted-foreground">
            <Spinner />
            <span>Loading references...</span>
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/20 p-4 text-red-900 dark:text-red-300">
            {error}
          </div>
        ) : references.length > 0 ? (
          <div className="pt-2">
            <SearchResultList searchResults={references} />
          </div>
        ) : hasFetched.current ? (
          <div className="rounded-md border bg-muted/30 p-4 text-muted-foreground">
            No nanopublications reference this one yet.
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
