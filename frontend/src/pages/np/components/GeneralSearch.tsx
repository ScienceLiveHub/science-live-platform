import { NanopubIcon } from "@/components/nanopub-icon";
import { PaginationControls } from "@/components/pagination-controls";
import { useTheme } from "@/components/theme-provider";
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
import { SEARCH_NANOPUBS, SEARCH_NANOPUBS_BY_TEMPLATES } from "@/lib/queries";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_TEXT } from "@/lib/sparql";
import { isNanopubUri } from "@/lib/uri";
import {
  FEED_GROUPS,
  FEED_TEMPLATE_LABELS,
  type FeedTemplateKey,
} from "@/pages/feed/use-feed";
import {
  getTemplateColorClass,
  LEGACY_TEMPLATE_URIS,
  TEMPLATE_METADATA,
  TEMPLATE_URI,
} from "@/pages/np/create/components/templates/registry-metadata";
import { TEMPLATE_VIEW_ICONS } from "@/pages/np/view/view-registry";
import {
  ArrowDownNarrowWide,
  Check,
  FileSymlink,
  FilterX,
  Minus,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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

/** Initial checked state for each template key — all unchecked by default in search */
const INITIAL_CHECKED: Record<FeedTemplateKey, boolean> = {
  AIDA_SENTENCE: false,
  CITATION_CITO: false,
  ANNOTATE_QUOTATION: false,
  COMMENT_PAPER: false,
  GEO_COVERAGE: false,
  DATASET: false,
  RESEARCH_SOFTWARE: false,
  ODRL_POLICY: false,
  ODRL_ACCESS_GRANT: false,
  PICO_RESEARCH_QUESTION: false,
  PCC_RESEARCH_QUESTION: false,
  PRISMA_SEARCH_STRATEGY: false,
  PRISMA_DATABASE_SEARCH: false,
  PRISMA_SEARCH_EXECUTION_DATASET: false,
  PRISMA_STUDY_INCLUSION: false,
  PRISMA_STUDY_ASSESSMENT: false,
  PRISMA_FULL_SCREENING: false,
  FORRT_CLAIM: false,
  FORRT_REPLICATION: false,
  FORRT_REPLICATION_OUTCOME: false,
  FORRT_KL_REPLICATION: false,
  FORRT_KL_REPLICATION_OUTCOME: false,
  RESEARCH_SYNTHESIS: false,
};

/** Collect all URIs (current + legacy) for the selected template keys. */
function getTemplateUris(keys: FeedTemplateKey[]): string[] {
  const uris: string[] = [];
  for (const key of keys) {
    uris.push(TEMPLATE_URI[key]);
    const legacy = LEGACY_TEMPLATE_URIS[key];
    if (legacy) {
      uris.push(...legacy);
    }
  }
  return uris;
}

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
 * Supports filtering by template type via the sidebar.
 */
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
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Whether there are likely more results beyond the current page. */
  const [hasMore, setHasMore] = useState(false);

  const [checked, setChecked] =
    useState<Record<FeedTemplateKey, boolean>>(INITIAL_CHECKED);

  const selectedTemplates = useMemo(() => {
    const s = new Set<FeedTemplateKey>();
    for (const [key, val] of Object.entries(checked)) {
      if (val) s.add(key as FeedTemplateKey);
    }
    return s;
  }, [checked]);

  const isNanopubInput = isNanopubUri(inputValue);
  const hasActiveContent = searchQuery || uri;

  const toggleTemplate = useCallback(
    (key: FeedTemplateKey) => {
      setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
      resetPage();
    },
    [resetPage],
  );

  const clearFilters = useCallback(() => {
    setChecked((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as FeedTemplateKey[]) {
        next[key] = false;
      }
      return next;
    });
    resetPage();
  }, [resetPage]);

  const toggleGroup = useCallback(
    (keys: FeedTemplateKey[]) => {
      setChecked((prev) => {
        const allOn = keys.every((k) => prev[k]);
        const next = { ...prev };
        for (const k of keys) {
          next[k] = !allOn;
        }
        return next;
      });
      resetPage();
    },
    [resetPage],
  );

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
        const rows =
          selectedTemplates.size === 0
            ? // No template filters: use unfiltered search query
              await executeBindSparql(
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
              )
            : // Template filters active: use template-filtered search query
              await executeBindSparql(
                SEARCH_NANOPUBS_BY_TEMPLATES,
                {
                  searchTerm: searchQuery,
                  searchProperty: SEARCH_MODE_PROPERTY[searchMode],
                  templateValues: getTemplateUris([...selectedTemplates])
                    .map((u) => `(<${u}>)`)
                    .join(" "),
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
  }, [searchQuery, sortBy, searchMode, currentPage, selectedTemplates]);

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
    </div>
  );

  // Template filter sidebar
  const renderTemplateSidebar = () => (
    <aside className="flex w-full flex-col gap-4 lg:w-64 lg:min-w-64">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Filter by template
        </h2>
        {selectedTemplates.size > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <FilterX className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
      </div>
      {FEED_GROUPS.map((group) => {
        const allOn = group.keys.every((k) => checked[k]);
        const someOn = !allOn && group.keys.some((k) => checked[k]);
        return (
          <div key={group.label} className="flex flex-col gap-1.5">
            <label
              className="flex cursor-pointer items-center gap-2 text-left select-none"
              onClick={() => toggleGroup(group.keys)}
            >
              <FeedCheckbox
                state={
                  allOn ? "checked" : someOn ? "indeterminate" : "unchecked"
                }
              />
              <span className="text-sm font-medium">{group.label}</span>
            </label>
            <div className="ml-6 flex flex-col gap-1">
              {group.keys.map((key) => {
                const templateUri = TEMPLATE_URI[key];
                const Icon = TEMPLATE_VIEW_ICONS[templateUri];
                const color = TEMPLATE_METADATA[templateUri]?.color;
                return (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 text-sm font-normal select-none"
                    onClick={() => toggleTemplate(key)}
                  >
                    <FeedCheckbox
                      state={checked[key] ? "checked" : "unchecked"}
                    />
                    {Icon ? (
                      <Icon
                        className={`w-3.5 h-3.5 min-w-3.5 min-h-3.5 ${getTemplateColorClass(color, resolvedTheme)}`}
                      />
                    ) : (
                      <NanopubIcon className="w-2.5 h-2.5 min-w-2.5 min-h-2.5 text-muted-foreground" />
                    )}
                    {FEED_TEMPLATE_LABELS[key]}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </aside>
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
      {searchQuery && (
        <div className="flex flex-col gap-6 lg:flex-row">
          {renderTemplateSidebar()}
          <section className="flex-1">{renderSearchResults()}</section>
        </div>
      )}
    </div>
  );
}

function FeedCheckbox({
  state,
}: {
  state: "checked" | "unchecked" | "indeterminate";
}) {
  return (
    <span
      className={`flex size-4 shrink-0 items-center justify-center rounded-lg border shadow-xs ${
        state === "unchecked"
          ? "border-input dark:bg-input/30"
          : "border-primary bg-primary text-primary-foreground"
      }`}
    >
      {state === "checked" && <Check className="size-3.5" />}
      {state === "indeterminate" && <Minus className="size-3.5" />}
    </span>
  );
}
