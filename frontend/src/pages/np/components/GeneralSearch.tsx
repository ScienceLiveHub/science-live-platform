import { PaginationControls } from "@/components/pagination-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePagination } from "@/hooks/use-pagination";
import { SEARCH_NANOPUBS } from "@/lib/queries";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_TEXT } from "@/lib/sparql";
import { isNanopubUri } from "@/lib/uri";
import { ArrowDownNarrowWide, FileSymlink, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ViewerDemo from "../ViewerDemo";
import SearchResultList, { type SearchResult } from "./SearchResultList";

/** Valid sort options for search results. */
const SORT_OPTIONS = ["maxScore", "maxRefs", "dateDesc", "dateAsc"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

/** SPARQL ORDER BY clause for each sort option. */
const SORT_ORDER_BY: Record<SortOption, string> = {
  maxScore: "desc(?maxScore)",
  maxRefs: "desc(?referenceCount)",
  dateDesc: "desc(?date)",
  dateAsc: "asc(?date)",
};

/** Valid search modes. */
const SEARCH_MODES = ["label", "fullText"] as const;
type SearchMode = (typeof SEARCH_MODES)[number];

/** SPARQL search:property value for each search mode. */
const SEARCH_MODE_PROPERTY: Record<SearchMode, string> = {
  label: "rdfs:label",
  fullText: "npa:hasFilterLiteral",
};

/**
 * GeneralSearch
 *
 * Combined search input and results display for general keyword search.
 *
 * - When no query is active: shows large search input, helper text, and example links
 * - When query is active: shows compact search bar at top and results below
 *
 * Handles both keyword search and nanopub URI navigation.
 * Supports pagination via the `page` URL search parameter.
 */
export function GeneralSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const uri = searchParams.get("uri") || "";
  const sortByParam = (searchParams.get("sort") || "maxScore") as SortOption;
  const sortBy: SortOption = SORT_OPTIONS.includes(sortByParam)
    ? sortByParam
    : "maxScore";
  const searchModeParam = (searchParams.get("mode") || "label") as SearchMode;
  const searchMode: SearchMode = SEARCH_MODES.includes(searchModeParam)
    ? searchModeParam
    : "label";

  const { currentPage, offset, limit, pageSize, setPage } = usePagination();

  const [inputValue, setInputValue] = useState(searchQuery || uri);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Whether there are likely more results beyond the current page. */
  const [hasMore, setHasMore] = useState(false);

  const isNanopubInput = isNanopubUri(inputValue);
  const hasActiveContent = searchQuery || uri;

  // Sync input value when URL params change externally
  useEffect(() => {
    setInputValue(searchQuery || uri);
  }, [searchQuery, uri]);

  // Load search results when searchQuery or page changes
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults(null);
      setHasMore(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const performSearch = async () => {
      try {
        // Fetch one extra row to detect whether there is a next page
        const rows = await executeBindSparql(
          SEARCH_NANOPUBS,
          {
            searchTerm: searchQuery,
            searchProperty: SEARCH_MODE_PROPERTY[searchMode],
            limit: String(limit),
            offset: String(offset),
            sortBy: SORT_ORDER_BY[sortBy],
          },
          NANOPUB_SPARQL_ENDPOINT_TEXT,
          controller.signal,
        );

        const { visibleRows, hasMore: moreResultsAvailable } =
          paginateRows(rows);

        setHasMore(moreResultsAvailable);
        setSearchResults(
          visibleRows.map((row) => ({
            np: row.np,
            label: row.label || "",
            date: new Date(row.date),
            creator: row.creator || "",
            type: row.type,
            template: row.template,
            maxScore: parseFloat(row.maxScore),
            referenceCount: parseInt(row.referenceCount),
          })),
        );
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error("Search failed:", e);
        setError(e?.message || "Search failed");
        setSearchResults(null);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    performSearch();

    return () => {
      controller.abort();
    };
  }, [searchQuery, sortBy, searchMode, currentPage]);

  /** Paginate raw SPARQL rows using the current page size. */
  function paginateRows<T>(rows: T[]) {
    const hasMoreRows = rows.length > pageSize;
    const visibleRows = hasMoreRows ? rows.slice(0, pageSize) : rows;
    return { visibleRows, hasMore: hasMoreRows };
  }

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    if (isNanopubUri(inputValue)) {
      // It's a nanopub URI - navigate to view it
      const next = new URLSearchParams(searchParams);
      next.set("uri", inputValue);
      next.delete("q");
      next.delete("page");
      setSearchParams(next);
    } else {
      // It's a search query - perform search (resets to page 1)
      const next = new URLSearchParams(searchParams);
      next.set("q", inputValue);
      next.delete("uri");
      next.delete("page");
      setSearchParams(next);
    }
  };

  /** Update sort parameter in URL, resetting to page 1. */
  const handleSortChange = (value: SortOption) => {
    const next = new URLSearchParams(searchParams);
    next.set("sort", value);
    next.delete("page");
    setSearchParams(next);
  };

  /** Update search mode parameter in URL, resetting to page 1. */
  const handleSearchModeChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("mode", value as SearchMode);
    next.delete("page");
    setSearchParams(next);
  };

  /** Search mode toggle, reused in compact bar and full search interface. */
  const renderSearchModeToggle = (size: "sm" | "default" = "default") => (
    <ToggleGroup
      type="single"
      value={searchMode}
      onValueChange={(v) => {
        if (v) handleSearchModeChange(v);
      }}
      variant="outline"
      size={size}
    >
      <ToggleGroupItem value="fullText" aria-label="Full-text search">
        Full-text
      </ToggleGroupItem>
      <ToggleGroupItem value="label" aria-label="Label search">
        Title only
      </ToggleGroupItem>
    </ToggleGroup>
  );

  /** Sort select dropdown, reused in compact bar and results header. */
  const renderSortSelect = (size: "sm" | "default" = "default") => (
    <Select
      value={sortBy}
      onValueChange={(v) => handleSortChange(v as SortOption)}
    >
      <SelectTrigger size={size} className="gap-1">
        <ArrowDownNarrowWide className="size-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="maxScore">Relevance</SelectItem>
        <SelectItem value="maxRefs">Most Referenced</SelectItem>
        <SelectItem value="dateDesc">Newest first</SelectItem>
        <SelectItem value="dateAsc">Oldest first</SelectItem>
      </SelectContent>
    </Select>
  );

  // Compact search bar (shown when there's active content)
  const renderCompactSearchBar = () => (
    <div className="flex flex-col gap-2">
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

    const firstResultIndex = (currentPage - 1) * pageSize + 1;
    const lastResultIndex = firstResultIndex + searchResults.length - 1;

    return (
      <div className="flex flex-col gap-4">
        {searchResults.length > 0 && !isNanopubInput && (
          <div className="flex gap-2">
            {renderSearchModeToggle("sm")}
            {renderSortSelect("sm")}
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">
            {searchResults.length > 0
              ? `Results ${firstResultIndex} - ${lastResultIndex} for "${searchQuery}"`
              : `No results for "${searchQuery}"`}
          </h2>
        </div>
        {searchResults.length > 0 ? (
          <SearchResultList searchResults={searchResults} />
        ) : (
          <div className="rounded-md border bg-muted/30 p-4 text-muted-foreground">
            No results found for your search.
          </div>
        )}
        <PaginationControls
          currentPage={currentPage}
          hasMore={hasMore}
          loading={loading}
          onPageChange={setPage}
        />
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
