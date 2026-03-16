import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useNanopub } from "@/hooks/use-nanopub";
import { executeBindSparql, SEARCH_NANOPUBS } from "@/lib/sparql";
import { getNanopubHash, isNanopubUri, toScienceLiveNPUri } from "@/lib/uri";
import { Calendar, FileCode, FileSymlink, Hash, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ViewerDemo from "../ViewerDemo";
import { NanopubViewer } from "./create/components/NanopubViewer";

/**
 * ViewNanopub
 *
 * All-in-one search page for nanopublications.
 * If the input is a nanopub URI (detected via isNanopubUri), loads and displays it.
 * Otherwise, performs a text search across the nanopub network and displays results.
 */

interface SearchResult {
  np: string;
  label: string;
  date: string;
}

export default function ViewNanopub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const uri = searchParams.get("uri") || "";
  const searchQuery = searchParams.get("q") || "";

  const [inputValue, setInputValue] = useState(uri || searchQuery);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null,
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const {
    store,
    loading: nanopubLoading,
    error: nanopubError,
    creatorUserIdsByOrcid,
  } = useNanopub(uri);

  // Determine if current input is a nanopub URI
  const isNanopubInput = isNanopubUri(inputValue);

  useEffect(() => {
    setInputValue(uri || searchQuery);
  }, [uri, searchQuery]);

  // Load search results when searchQuery changes
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults(null);
      return;
    }

    let mounted = true;
    setSearchLoading(true);
    setSearchError(null);

    const performSearch = async () => {
      try {
        const rows = await executeBindSparql(SEARCH_NANOPUBS, {
          searchTerm: searchQuery,
        });

        if (mounted) {
          setSearchResults(
            rows.map((row) => ({
              np: row.np,
              label: row.label || "",
              date: row.date || "",
            })),
          );
        }
      } catch (e: any) {
        if (mounted) {
          console.error("Search failed:", e);
          setSearchError(e?.message || "Search failed");
          setSearchResults(null);
        }
      } finally {
        if (mounted) setSearchLoading(false);
      }
    };

    performSearch();

    return () => {
      mounted = false;
    };
  }, [searchQuery]);

  const handleGoClick = () => {
    if (!inputValue.trim()) return;

    if (isNanopubUri(inputValue)) {
      // It's a nanopub URI - navigate to view it
      const next = new URLSearchParams(searchParams);
      next.set("uri", inputValue);
      next.delete("q");
      setSearchParams(next);
      setSearchResults(null);
    } else {
      // It's a search query - perform search
      const next = new URLSearchParams(searchParams);
      next.set("q", inputValue);
      next.delete("uri");
      setSearchParams(next);
    }
  };

  const loading = nanopubLoading || searchLoading;
  const error = nanopubError || searchError;

  // Check if we have active content (URI loaded or search performed)
  const hasActiveContent = uri || searchQuery;

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-4xl">
      {/* Prominent Search Field - always visible but different styles based on context */}
      <div
        className={`flex flex-col items-center ${!hasActiveContent ? "justify-center flex-1" : ""}`}
      >
        {!hasActiveContent && (
          <h1 className="flex items-center text-xl text-muted-foreground font-black my-8">
            <FileCode className="mr-4" />
            BROWSE NANOPUBLICATIONS
          </h1>
        )}

        <div className={`w-full max-w-2xl ${hasActiveContent ? "" : "px-4"}`}>
          <div className="flex gap-2">
            <Input
              type="text"
              className={`w-full ${!hasActiveContent ? "h-12 text-lg px-6" : "justify-end"}`}
              placeholder="Enter search query or nanopub URI..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleGoClick();
                }
              }}
            />
            <Button
              className={`inline-flex items-center rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 ${!hasActiveContent ? "h-12 px-8 text-lg" : "px-6"}`}
              disabled={loading}
              onClick={handleGoClick}
            >
              {loading ? (
                <Spinner className="h-5 w-5" />
              ) : isNanopubInput ? (
                <>
                  {!hasActiveContent && <FileSymlink className="h-5 w-5" />}
                  View
                </>
              ) : (
                <>
                  {!hasActiveContent && <Search className="h-5 w-5" />}
                  Go
                </>
              )}
            </Button>
          </div>

          {!hasActiveContent && (
            <p className="text-center text-muted-foreground mt-4 text-sm">
              Search across the Nanopublications network or enter a
              nanopublication URI to view it
            </p>
          )}
        </div>
      </div>

      {/* Status / Errors */}
      {loading && hasActiveContent && (
        <div className="rounded-md border bg-muted/30 p-4 flex items-center gap-3 text-muted-foreground">
          <Spinner />{" "}
          <span>
            {searchQuery ? "Searching..." : "Loading nanopublication..."}
          </span>
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-900">
          {error}
        </div>
      )}

      {/* Nanopub Viewer */}
      {uri && !searchQuery ? (
        <>
          {!nanopubLoading && !nanopubError && (
            <>
              {store ? (
                <NanopubViewer
                  store={store}
                  creatorUserIdsByOrcid={creatorUserIdsByOrcid}
                />
              ) : null}
            </>
          )}
        </>
      ) : null}

      {/* Search Results */}
      {searchQuery && !searchLoading && !searchError && searchResults ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}{" "}
            for "{searchQuery}"
          </h2>
          {searchResults.length > 0 ? (
            <div className="flex flex-col gap-3">
              {searchResults.map((result, index) => (
                <div className="flex flex-col gap-2 block rounded-lg border bg-card p-4">
                  {/* Label/Title */}
                  <Link
                    key={result.np || index}
                    to={toScienceLiveNPUri(result.np)}
                    className="text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    <div className="font-medium">
                      {result.label || "Untitled Nanopublication"}
                    </div>
                  </Link>

                  {/* Nanopub URI */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="font-mono text-xs truncate">
                      {getNanopubHash(result.np)?.substring(0, 10)}...
                    </span>
                  </div>

                  {/* Date */}
                  {result.date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{new Date(result.date).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 p-4 text-muted-foreground">
              No results found for your search.
            </div>
          )}
        </div>
      ) : null}

      {/* Default Demo when no URI or search */}
      {!uri && !searchQuery ? (
        <div className="mt-8">
          <ViewerDemo />
        </div>
      ) : null}
    </main>
  );
}
