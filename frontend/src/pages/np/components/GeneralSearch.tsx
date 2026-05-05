/**
 * GeneralSearch
 *
 * Combined search and results display for general keyword search and/or template filtering.
 * Supports sorting, toggle full-text/title search, and results pagination.
 *
 * Behaviour:
 * - When no query is active: shows Latest Nanopublications chronologically.
 * - When query is a nanopub URI: shows a button to view that nanopub in detail.
 * - When query is general keywords: shows a button to retrieve search results.
 * - URL search params synced with search query text and search bar settings.
 *
 */

import { PaginationControls } from "@/components/pagination-controls";
import { useTheme } from "@/components/theme-provider";
import { Spinner } from "@/components/ui/spinner";
import { useNanopubSearch } from "@/hooks/use-nanopub-search";
import { usePagination } from "@/hooks/use-pagination";
import { isNanopubUri } from "@/lib/uri";
import { type FeedTemplateKey } from "@/pages/np/create/components/templates/registry-metadata";
import { FileSymlink, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  SEARCH_MODES,
  SearchBar,
  SORT_OPTIONS,
  type SearchMode,
  type SortOption,
} from "./search/SearchBar";
import SearchResultList from "./search/SearchResultList";
import { TemplateFilterSidebar } from "./search/TemplateFilterSidebar";

export function GeneralSearch() {
  const { resolvedTheme } = useTheme();
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

  const { currentPage, offset, limit, pageSize, setPage, resetPage } =
    usePagination();

  const [inputValue, setInputValue] = useState(searchQuery || uri);
  /** Incremented to force a re-fetch when the same query is re-submitted. */
  const [refetchCounter, setRefetchCounter] = useState(0);

  const [selectedTemplates, setSelectedTemplates] = useState<
    Set<FeedTemplateKey>
  >(new Set());

  const isNanopubInput = isNanopubUri(inputValue);

  const handleSelectedTemplatesChange = useCallback(
    (selected: Set<FeedTemplateKey>) => {
      setSelectedTemplates(selected);
      resetPage();
    },
    [resetPage],
  );

  // Sync input value when URL params change externally
  useEffect(() => {
    setInputValue(searchQuery || uri);
  }, [searchQuery, uri]);

  // Whether we are showing the "latest nanopubs" default view (no search query)
  const isLatestView = !searchQuery;

  /** Effective sort: "Relevance" (maxScore) is only available with a search query. */
  const effectiveSortBy: SortOption =
    isLatestView && sortBy === "maxScore" ? "dateDesc" : sortBy;

  // ---- Fetch results via shared hook ----
  const { searchResults, loading, error, hasMore } = useNanopubSearch({
    searchQuery,
    effectiveSortBy,
    searchMode,
    limit,
    offset,
    pageSize,
    selectedTemplates,
    isLatestView,
    refetchCounter,
  });

  const handleSubmit = () => {
    if (isNanopubUri(inputValue)) {
      // It's a nanopub URI - navigate to view it
      const next = new URLSearchParams(searchParams);
      next.set("uri", inputValue);
      next.delete("q");
      next.delete("page");
      setSearchParams(next);
    } else {
      // It's a search query (or empty) - perform search (resets to page 1)
      const next = new URLSearchParams(searchParams);
      if (inputValue.trim()) {
        next.set("q", inputValue);
      } else {
        next.delete("q");
      }
      next.delete("uri");
      next.delete("page");
      setSearchParams(next);
      // Force re-fetch even if params are unchanged
      setRefetchCounter((c) => c + 1);
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
  const handleSearchModeChange = (value: SearchMode) => {
    const next = new URLSearchParams(searchParams);
    next.set("mode", value);
    next.delete("page");
    setSearchParams(next);
  };

  // Render search results (used for both latest and search views)
  const renderSearchResults = () => {
    if (loading) {
      return (
        <div className="rounded-md border bg-muted/30 p-4 flex items-center gap-3 text-muted-foreground">
          <Spinner />{" "}
          <span>{isLatestView ? "Loading latest…" : "Searching…"}</span>
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
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            {isLatestView
              ? searchResults.length > 0
                ? selectedTemplates.size > 0
                  ? `Nanopublications`
                  : `Latest Nanopublications`
                : `No nanopublications found`
              : searchResults.length > 0
                ? `Results ${firstResultIndex} - ${lastResultIndex} for "${searchQuery}"`
                : `No results for "${searchQuery}"`}
            {selectedTemplates.size > 0 && " with selected Template(s)"}
          </h2>
        </div>
        {searchResults.length > 0 ? (
          <SearchResultList searchResults={searchResults} />
        ) : (
          <div className="rounded-md border bg-muted/30 p-4 text-muted-foreground">
            {isLatestView
              ? "No nanopublications found."
              : "No results found for your search."}
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
      <SearchBar
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={handleSubmit}
        onClear={() => {
          setInputValue("");
          const next = new URLSearchParams(searchParams);
          next.delete("q");
          next.delete("uri");
          next.delete("page");
          setSearchParams(next);
        }}
        placeholder="Enter search query or nanopub URI..."
        loading={loading}
        searchMode={searchMode}
        onSearchModeChange={handleSearchModeChange}
        effectiveSortBy={effectiveSortBy}
        onSortChange={handleSortChange}
        isLatestView={isLatestView}
        submitContent={
          isNanopubInput ? (
            <>
              <FileSymlink className="h-5 w-5" />
              View
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              Go
            </>
          )
        }
        submitClassName="inline-flex items-center rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 px-6"
      />
      <div className="flex flex-row gap-6">
        <div className="flex flex-col gap-6">
          <TemplateFilterSidebar
            resolvedTheme={resolvedTheme === "dark" ? "dark" : "light"}
            onSelectedTemplatesChange={handleSelectedTemplatesChange}
          />
        </div>
        <section className="flex-1">{renderSearchResults()}</section>
      </div>
    </div>
  );
}
