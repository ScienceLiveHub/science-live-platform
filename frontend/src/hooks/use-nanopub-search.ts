/**
 * useNanopubSearch
 *
 * Shared hook that encapsulates the SPARQL fetch logic for nanopub search.
 * Used by both GeneralSearch (URL-param driven) and NanopubSearchPicker
 * (internal-state driven).
 *
 * Handles AbortController cleanup for React Strict Mode double-invocation.
 */

import {
  LATEST_ALL,
  LATEST_BY_TEMPLATES,
  SEARCH_NANOPUBS,
  SEARCH_NANOPUBS_BY_TEMPLATES,
} from "@/lib/queries";
import {
  executeBindSparql,
  NANOPUB_SPARQL_ENDPOINT_FULL,
  NANOPUB_SPARQL_ENDPOINT_TEXT,
} from "@/lib/sparql";
import { bestLabelForRow } from "@/lib/string-format";
import {
  getTemplateUris,
  paginateRows,
  SEARCH_MODE_PROPERTY,
  SORT_ORDER_BY,
  type SearchMode,
  type SortOption,
} from "@/pages/np/components/search/SearchBar";
import type { SearchResult } from "@/pages/np/components/search/SearchResultList";
import type { FeedTemplateKey } from "@/pages/np/create/components/templates/registry-metadata";
import { useEffect, useState } from "react";

export interface UseNanopubSearchParams {
  /** The current search query string (empty = "latest" view). */
  searchQuery: string;
  /** Effective sort option (already adjusted for isLatestView). */
  effectiveSortBy: SortOption;
  /** Current search mode (label vs fullText). */
  searchMode: SearchMode;
  /** Number of items to fetch (pageSize + 1 for has-more detection). */
  limit: number;
  /** Offset into the result set. */
  offset: number;
  /** Page size used for pagination slicing. */
  pageSize: number;
  /** Set of selected template keys for filtering. */
  selectedTemplates: Set<FeedTemplateKey>;
  /** Whether we are in the "latest" (no query) view. */
  isLatestView: boolean;
  /** Counter incremented to force a re-fetch with the same params. */
  refetchCounter: number;
}

export interface UseNanopubSearchResult {
  searchResults: SearchResult[] | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}

export function useNanopubSearch({
  searchQuery,
  effectiveSortBy,
  searchMode,
  limit,
  offset,
  pageSize,
  selectedTemplates,
  isLatestView,
  refetchCounter,
}: UseNanopubSearchParams): UseNanopubSearchResult {
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const fetchResults = async () => {
      try {
        let rows: any[];

        const sharedParams = {
          sortBy: SORT_ORDER_BY[effectiveSortBy],
          limit: String(limit),
          offset: String(offset),
        };

        // Pre-compute template values string if filters are active
        const templateValues =
          selectedTemplates.size > 0
            ? getTemplateUris([...selectedTemplates])
                .map((u) => `(<${u}>)`)
                .join(" ")
            : undefined;

        if (isLatestView) {
          // Browse latest nanopubs (no search text)
          if (templateValues) {
            rows = await executeBindSparql(
              LATEST_BY_TEMPLATES,
              { ...sharedParams, templateValues },
              NANOPUB_SPARQL_ENDPOINT_FULL,
              controller.signal,
            );
          } else {
            rows = await executeBindSparql(
              LATEST_ALL,
              sharedParams,
              NANOPUB_SPARQL_ENDPOINT_FULL,
              controller.signal,
            );
          }
        } else {
          // Text search with optional template filter
          if (templateValues) {
            rows = await executeBindSparql(
              SEARCH_NANOPUBS_BY_TEMPLATES,
              {
                ...sharedParams,
                searchTerm: searchQuery,
                searchProperty: SEARCH_MODE_PROPERTY[searchMode],
                templateValues,
              },
              NANOPUB_SPARQL_ENDPOINT_TEXT,
              controller.signal,
            );
          } else {
            rows = await executeBindSparql(
              SEARCH_NANOPUBS,
              {
                ...sharedParams,
                searchTerm: searchQuery,
                searchProperty: SEARCH_MODE_PROPERTY[searchMode],
              },
              NANOPUB_SPARQL_ENDPOINT_TEXT,
              controller.signal,
            );
          }
        }

        const { visibleRows, hasMore: moreResultsAvailable } = paginateRows(
          rows,
          pageSize,
        );

        setHasMore(moreResultsAvailable);
        setSearchResults(
          visibleRows.map((row: any) => {
            return {
              np: row.np,
              label: bestLabelForRow(row),
              date: new Date(row.date),
              creator: row.creator || "",
              types: row.types ? row.types.split("|") : [],
              template: row.template,
              maxScore:
                row.maxScore != null ? parseFloat(row.maxScore) : undefined,
              referenceCount:
                row.referenceCount != null
                  ? parseInt(row.referenceCount)
                  : undefined,
            };
          }),
        );
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error("Search failed:", e);
        setError(e?.message || "Search failed");
        setSearchResults(null);
        setHasMore(false);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      controller.abort();
    };
  }, [
    searchQuery,
    effectiveSortBy,
    searchMode,
    limit,
    offset,
    pageSize,
    selectedTemplates,
    isLatestView,
    refetchCounter,
  ]);

  return { searchResults, loading, error, hasMore };
}
