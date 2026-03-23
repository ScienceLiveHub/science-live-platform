import { Spinner } from "@/components/ui/spinner";
import { SEARCH_NANOPUBS } from "@/lib/queries";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_TEXT } from "@/lib/sparql";
import { useEffect, useState } from "react";
import SearchResultList, { type SearchResult } from "./SearchResultList";

interface GeneralSearchProps {
  /** The current search query string (from URL search params). */
  searchQuery: string;
}

/**
 * GeneralSearch
 *
 * Performs a keyword search across the nanopub network and displays results.
 * Manages its own loading/error state and SPARQL query lifecycle.
 */
export function GeneralSearch({ searchQuery }: GeneralSearchProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load search results when searchQuery changes
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const performSearch = async () => {
      try {
        const rows = await executeBindSparql(
          SEARCH_NANOPUBS,
          { searchTerm: searchQuery },
          NANOPUB_SPARQL_ENDPOINT_TEXT,
          controller.signal,
        );

        setSearchResults(
          rows.map((row) => ({
            np: row.np,
            label: row.label || "",
            date: new Date(row.date),
            creator: row.creator || "",
            isExample: row.isExample === "true",
            maxScore: parseFloat(row.maxScore),
            referenceCount: parseInt(row.referenceCount),
          })),
        );
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error("Search failed:", e);
        setError(e?.message || "Search failed");
        setSearchResults(null);
      } finally {
        setLoading(false);
      }
    };

    performSearch();

    return () => {
      controller.abort();
    };
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 flex items-center gap-3 text-muted-foreground">
        <Spinner /> <span>Searching…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-900">
        {error}
      </div>
    );
  }

  if (!searchResults) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">
        {searchResults.length} result
        {searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
      </h2>
      {searchResults.length > 0 ? (
        <SearchResultList searchResults={searchResults} />
      ) : (
        <div className="rounded-md border bg-muted/30 p-4 text-muted-foreground">
          No results found for your search.
        </div>
      )}
    </div>
  );
}
