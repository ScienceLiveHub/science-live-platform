/**
 * SearchBar
 *
 * Shared search bar component used by both GeneralSearch and NanopubSearchPicker.
 * Includes the search input, submit button, search-mode toggle, and sort select.
 *
 */

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
import {
  LEGACY_TEMPLATE_URIS,
  TEMPLATE_URI,
  type FeedTemplateKey,
} from "@/pages/np/create/components/templates/registry-metadata";
import { ArrowDownNarrowWide, Check, Minus, Search, X } from "lucide-react";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Shared constants & types
// ---------------------------------------------------------------------------

/** Valid sort options for search results. */
export const SORT_OPTIONS = [
  "maxScore",
  "maxRefs",
  "dateDesc",
  "dateAsc",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/** SPARQL ORDER BY clause for each sort option. */
export const SORT_ORDER_BY: Record<SortOption, string> = {
  maxScore: "desc(?maxScore)",
  maxRefs: "desc(?referenceCount)",
  dateDesc: "desc(?date)",
  dateAsc: "asc(?date)",
};

/** Valid search modes. */
export const SEARCH_MODES = ["label", "fullText"] as const;
export type SearchMode = (typeof SEARCH_MODES)[number];

/** SPARQL search:property value for each search mode. */
export const SEARCH_MODE_PROPERTY: Record<SearchMode, string> = {
  label: "rdfs:label",
  fullText: "npa:hasFilterLiteral",
};

/** Initial checked state for each template key — all unchecked by default */
export const INITIAL_CHECKED: Record<FeedTemplateKey, boolean> = {
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
export function getTemplateUris(keys: FeedTemplateKey[]): string[] {
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

/** Paginate raw SPARQL rows using the given page size. */
export function paginateRows<T>(rows: T[], pageSize: number) {
  const hasMoreRows = rows.length > pageSize;
  const visibleRows = hasMoreRows ? rows.slice(0, pageSize) : rows;
  return { visibleRows, hasMore: hasMoreRows };
}

// ---------------------------------------------------------------------------
// FilterCheckbox (shared between sidebar and result header)
// ---------------------------------------------------------------------------

export function FilterCheckbox({
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

// ---------------------------------------------------------------------------
// SearchBar component
// ---------------------------------------------------------------------------

export interface SearchBarProps {
  /** Current value of the search input. */
  inputValue: string;
  /** Called when the input value changes. */
  onInputChange: (value: string) => void;
  /** Called when the user submits the search (Enter key or button click). */
  onSubmit: () => void;
  /** Called when the user clicks the clear (X) button. */
  onClear: () => void;
  /** Placeholder text for the input. */
  placeholder?: string;
  /** Whether a search is currently in progress. */
  loading: boolean;
  /** Current search mode. */
  searchMode: SearchMode;
  /** Called when the search mode changes. */
  onSearchModeChange: (mode: SearchMode) => void;
  /** Effective sort option (respects isLatestView override). */
  effectiveSortBy: SortOption;
  /** Called when the sort option changes. */
  onSortChange: (sort: SortOption) => void;
  /** Whether we are in the "latest" view (disables Relevance sort). */
  isLatestView: boolean;
  /** Optional custom content for the submit button. Defaults to Search icon + "Search". */
  submitContent?: ReactNode;
  /** Optional extra className for the submit Button. */
  submitClassName?: string;
}

export function SearchBar({
  inputValue,
  onInputChange,
  onSubmit,
  onClear,
  placeholder = "Search nanopublications...",
  loading,
  searchMode,
  onSearchModeChange,
  effectiveSortBy,
  onSortChange,
  isLatestView,
  submitContent,
  submitClassName,
}: SearchBarProps) {
  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            className="w-full pr-8"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSubmit();
              }
            }}
          />
          {inputValue && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          className={submitClassName}
          disabled={loading}
          onClick={onSubmit}
        >
          {loading ? (
            <Spinner className="h-5 w-5" />
          ) : (
            (submitContent ?? (
              <>
                <Search className="h-5 w-5" />
                Search
              </>
            ))
          )}
        </Button>
      </div>
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex gap-2 items-center">
          <span className="text-sm">Search in:</span>
          <ToggleGroup
            type="single"
            value={searchMode}
            onValueChange={(v) => {
              if (v) onSearchModeChange(v as SearchMode);
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="fullText" aria-label="Full-text search">
              Full-text
            </ToggleGroupItem>
            <ToggleGroupItem value="label" aria-label="Label search">
              Title only
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm">Sort by:</span>
          <Select
            value={effectiveSortBy}
            onValueChange={(v) => onSortChange(v as SortOption)}
          >
            <SelectTrigger size="sm" className="gap-1">
              <ArrowDownNarrowWide className="size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="maxScore" disabled={isLatestView}>
                Relevance
              </SelectItem>
              <SelectItem value="maxRefs">Most Referenced</SelectItem>
              <SelectItem value="dateDesc">Newest first</SelectItem>
              <SelectItem value="dateAsc">Oldest first</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            Wildcard match * in search term supported
          </span>
        </div>
      </div>
    </div>
  );
}
