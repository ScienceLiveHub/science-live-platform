import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { SEARCH_NANOPUBS } from "@/lib/queries";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_TEXT } from "@/lib/sparql";
import { isNanopubUri } from "@/lib/uri";
import { FileSymlink, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ViewerDemo from "../ViewerDemo";
import SearchResultList, { type SearchResult } from "./SearchResultList";

/**
 * GeneralSearch
 *
 * Combined search input and results display for general keyword search.
 *
 * - When no query is active: shows large search input, helper text, and example links
 * - When query is active: shows compact search bar at top and results below
 *
 * Handles both keyword search and nanopub URI navigation.
 */
export function GeneralSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const uri = searchParams.get("uri") || "";

  const [inputValue, setInputValue] = useState(searchQuery || uri);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNanopubInput = isNanopubUri(inputValue);
  const hasActiveContent = searchQuery || uri;

  // Sync input value when URL params change externally
  useEffect(() => {
    setInputValue(searchQuery || uri);
  }, [searchQuery, uri]);

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

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    if (isNanopubUri(inputValue)) {
      // It's a nanopub URI - navigate to view it
      const next = new URLSearchParams(searchParams);
      next.set("uri", inputValue);
      next.delete("q");
      setSearchParams(next);
    } else {
      // It's a search query - perform search
      const next = new URLSearchParams(searchParams);
      next.set("q", inputValue);
      next.delete("uri");
      setSearchParams(next);
    }
  };

  // Compact search bar (shown when there's active content)
  const renderCompactSearchBar = () => (
    <div className="flex gap-2">
      <Input
        type="text"
        className="w-full justify-end"
        placeholder="Enter search query or nanopub URI..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSubmit();
          }
        }}
      />
      <Button
        className="inline-flex items-center rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 px-6"
        disabled={loading}
        onClick={handleSubmit}
      >
        {loading ? (
          <Spinner className="h-5 w-5" />
        ) : isNanopubInput ? (
          <>
            <FileSymlink className="h-5 w-5" />
            View
          </>
        ) : (
          <>
            <Search className="h-5 w-5" />
            Go
          </>
        )}
      </Button>
    </div>
  );

  // Full search interface (shown when no content is active)
  const renderFullSearchInterface = () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          type="text"
          className="h-12 text-lg px-6"
          placeholder="Enter search query or nanopub URI..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
        />
        <Button
          className="inline-flex items-center rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 h-12 px-8 text-lg"
          onClick={handleSubmit}
        >
          {isNanopubInput ? (
            <>
              <FileSymlink className="h-5 w-5 mr-2" />
              View
            </>
          ) : (
            <>
              <Search className="h-5 w-5 mr-2" />
              Go
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-muted-foreground text-sm">
        Search across the Nanopublications network or enter a nanopublication
        URI to view it
      </p>

      {/* Example links shown when idle */}
      <ViewerDemo />
    </div>
  );

  // Render search results
  const renderSearchResults = () => {
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
  };

  return (
    <div className="flex flex-col gap-4">
      {hasActiveContent
        ? renderCompactSearchBar()
        : renderFullSearchInterface()}
      {searchQuery && renderSearchResults()}
    </div>
  );
}
