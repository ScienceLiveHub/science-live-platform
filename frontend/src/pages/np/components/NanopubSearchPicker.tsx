/**
 * NanopubSearchPicker
 *
 * A simplified embeddable nanopub search component with multi-select capability.
 * Designed to work standalone without react-router (e.g. in Zotero iframe context).
 *
 * Primary use-case is for searching and selecting multiple nanopublications for
 * further processing (e.g. importing into Zotero).
 *
 * Reuses the same SPARQL queries and search logic as GeneralSearch, but manages
 * all state internally instead of via URL search params.
 */

import { NanopubIcon } from "@/components/nanopub-icon";
import { PaginationControls } from "@/components/pagination-controls";
import { RelativeDateTime } from "@/components/relative-datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { AsyncLabel } from "@/hooks/use-labels";
import { useNanopubSearch } from "@/hooks/use-nanopub-search";
import { getUriEnd } from "@/lib/uri";
import {
  type FeedTemplateKey,
  getTemplateColorClass,
  TEMPLATE_METADATA,
} from "@/pages/np/create/components/templates/registry-metadata";
import { TEMPLATE_VIEW_ICONS } from "@/pages/np/view/view-registry";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FilterCheckbox,
  SearchBar,
  type SearchMode,
  type SortOption,
} from "./SearchBar";
import { TemplateFilterSidebar } from "./TemplateFilterSidebar";

// Detect dark mode from document class (works in Zotero iframe context)
// TODO: if you use NanopubSearchPicker elsewhere, you may need to use a different method
const zoteroTheme = document.documentElement.classList.contains("dark")
  ? "dark"
  : "light";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Template icon for a search result (standalone, no useTheme dependency). */
function PickerTemplateIcon({ template }: { template?: string }) {
  const Icon = template ? TEMPLATE_VIEW_ICONS[template] : undefined;
  const color = template ? TEMPLATE_METADATA[template]?.color : undefined;
  return Icon ? (
    <Icon
      className={`w-4 h-4 min-w-4 min-h-4 mt-1 mr-2 ${getTemplateColorClass(color, zoteroTheme)}`}
    />
  ) : (
    <NanopubIcon className="w-3 h-3 min-w-3 min-h-3 mt-1.5 mr-2 text-muted-foreground" />
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NanopubSearchPickerProps {
  /** Pre-fill the search input and auto-trigger search on mount. */
  initialQuery?: string;
  /** Optional Label to show on the confirm button. */
  confirmLabel?: string;
  /** Called when the user confirms their selection. */
  onConfirm: (selectedUris: string[]) => void;
  /** Called when the user cancels. */
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function NanopubSearchPicker({
  initialQuery = "",
  confirmLabel = "Confirm Selection",
  onConfirm,
  onCancel,
}: NanopubSearchPickerProps) {
  // ---- Search state (replaces URL search params) ----
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<SortOption>("dateDesc");
  const [searchMode, setSearchMode] = useState<SearchMode>("label");
  const [currentPage, setCurrentPage] = useState(1);
  const [refetchCounter, setRefetchCounter] = useState(0);

  // ---- Selection state ----
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());

  // ---- Template filter state ----
  const [selectedTemplates, setSelectedTemplates] = useState<
    Set<FeedTemplateKey>
  >(new Set());

  // ---- Pagination helpers ----
  const pageSize = DEFAULT_PAGE_SIZE;
  const offset = (currentPage - 1) * pageSize;
  const limit = pageSize + 1;

  const resetPage = useCallback(() => setCurrentPage(1), []);

  // ---- Template filter callback ----
  const handleSelectedTemplatesChange = useCallback(
    (selected: Set<FeedTemplateKey>) => {
      setSelectedTemplates(selected);
      resetPage();
    },
    [resetPage],
  );

  // ---- Selection callbacks ----
  const toggleSelection = useCallback((uri: string) => {
    setSelectedUris((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedUris(new Set());
  }, []);

  // Whether we are showing the "latest nanopubs" default view (no search query)
  const isLatestView = !searchQuery;

  /** Effective sort: "Relevance" (maxScore) is only available with a search query. */
  const effectiveSortBy: SortOption =
    isLatestView && sortBy === "maxScore" ? "dateDesc" : sortBy;

  // ---- Auto-search on mount if initialQuery is provided ----
  const hasAutoSearched = useRef(false);
  useEffect(() => {
    if (initialQuery && !hasAutoSearched.current) {
      hasAutoSearched.current = true;
      setSearchQuery(initialQuery);
      // Sort by relevance when searching
      setSortBy("maxScore");
    }
  }, [initialQuery]);

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

  const allVisibleSelected = useMemo(() => {
    if (!searchResults || searchResults.length === 0) return false;
    return searchResults.every((r) => selectedUris.has(r.np));
  }, [searchResults, selectedUris]);

  const toggleSelectAll = useCallback(() => {
    if (!searchResults) return;
    const visibleUris = searchResults.map((r) => r.np);
    setSelectedUris((prev) => {
      const allSelected = visibleUris.every((uri) => prev.has(uri));
      const next = new Set(prev);
      if (allSelected) {
        for (const uri of visibleUris) {
          next.delete(uri);
        }
      } else {
        for (const uri of visibleUris) {
          next.add(uri);
        }
      }
      return next;
    });
  }, [searchResults]);

  // ---- Handlers ----
  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    setSearchQuery(trimmed);
    setCurrentPage(1);
    if (trimmed) {
      setSortBy("maxScore");
    }
    setRefetchCounter((c) => c + 1);
  };

  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleSearchModeChange = (value: SearchMode) => {
    setSearchMode(value);
    setCurrentPage(1);
  };

  // ---- Render helpers ----
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
        <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950 p-4 text-red-900 dark:text-red-200">
          {error}
        </div>
      );
    }

    if (!searchResults) return null;

    const firstResultIndex = (currentPage - 1) * pageSize + 1;
    const lastResultIndex = firstResultIndex + searchResults.length - 1;

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold">
            {isLatestView
              ? searchResults.length > 0
                ? selectedTemplates.size > 0
                  ? "Nanopublications"
                  : "Latest Nanopublications"
                : "No nanopublications found"
              : searchResults.length > 0
                ? `Results ${firstResultIndex}–${lastResultIndex} for "${searchQuery}"`
                : `No results for "${searchQuery}"`}
            {selectedTemplates.size > 0 && " with selected Template(s)"}
          </h2>
          {searchResults.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <FilterCheckbox
                state={allVisibleSelected ? "checked" : "unchecked"}
              />
              {allVisibleSelected ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>

        {searchResults.length > 0 ? (
          <div className="flex flex-col gap-2">
            {searchResults.map((result, index) => {
              const isSelected = selectedUris.has(result.np);
              return (
                <div
                  key={result.np || index}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "bg-card hover:bg-accent/5 hover:border-accent/70"
                  }`}
                  onClick={() => toggleSelection(result.np)}
                >
                  <Checkbox
                    checked={isSelected}
                    // onCheckedChange={() => toggleSelection(result.np)}
                    className="mt-1 shrink-0"
                  />
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    {/* Label/Title */}
                    <div className="font-medium flex flex-row text-sm">
                      <PickerTemplateIcon template={result.template} />
                      <span className="truncate">
                        {result.label || "Untitled Nanopublication"}
                      </span>
                    </div>

                    {/* Creator URI (simplified — no async label lookup) */}
                    {result.creator && (
                      <div className="text-xs text-muted-foreground truncate">
                        By <AsyncLabel uri={result.creator} link />
                      </div>
                    )}

                    {/* Type badges */}
                    {result.types && result.types.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {result.types.map((type) => (
                          <Badge
                            key={type}
                            variant="outline"
                            className="text-xs h-5 px-1.5"
                          >
                            {getUriEnd(type)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Date */}
                    {result.date && (
                      <div className="text-xs text-muted-foreground">
                        <RelativeDateTime date={result.date} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
          onPageChange={setCurrentPage}
        />
      </div>
    );
  };

  // ---- Main render ----
  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <SearchBar
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={handleSubmit}
        onClear={() => {
          setInputValue("");
          setSearchQuery("");
          setCurrentPage(1);
        }}
        placeholder="Enter search query..."
        loading={loading}
        searchMode={searchMode}
        onSearchModeChange={handleSearchModeChange}
        effectiveSortBy={effectiveSortBy}
        onSortChange={handleSortChange}
        isLatestView={isLatestView}
      />

      {/* Content area: sidebar + results */}
      <div className="flex flex-row gap-4 flex-1 min-h-0 overflow-auto">
        <div className="flex flex-col gap-4 shrink-0">
          <TemplateFilterSidebar
            resolvedTheme={zoteroTheme}
            onSelectedTemplatesChange={handleSelectedTemplatesChange}
          />
        </div>
        <section className="flex-1 min-w-0 mr-4">
          {renderSearchResults()}
        </section>
      </div>

      {/* Sticky bottom action bar */}
      <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-4 rounded-lg border bg-card p-3 shadow-sm">
        <div className="text-sm text-muted-foreground">
          {selectedUris.size > 0 ? (
            <>
              <span className="font-medium text-foreground">
                {selectedUris.size}
              </span>{" "}
              selected
              <button
                type="button"
                onClick={clearSelection}
                className="ml-2 text-xs text-muted-foreground hover:text-foreground underline"
              >
                Clear
              </button>
            </>
          ) : (
            "Select nanopublications from the results above"
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm([...selectedUris])}
            disabled={selectedUris.size === 0}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
