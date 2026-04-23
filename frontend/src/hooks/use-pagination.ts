import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/** Default number of items per page. */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Hook for URL-based pagination state.
 *
 * Reads and writes a `page` search parameter in the current URL.
 * Provides helpers for computing SPARQL offset/limit values and
 * detecting whether more results exist beyond the current page.
 *
 * @param pageSize Number of items per page (defaults to 10).
 * @param pageParam Name of the URL search parameter (defaults to "page").
 */
export function usePagination(
  pageSize = DEFAULT_PAGE_SIZE,
  pageParam = "page",
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Math.max(
    1,
    parseInt(searchParams.get(pageParam) || "1", 10),
  );

  /** Computed SPARQL offset for the current page. */
  const offset = (currentPage - 1) * pageSize;

  /** Limit to pass to SPARQL — fetch one extra row to detect next page. */
  const limit = pageSize + 1;

  /** Set the current page (updates the URL). */
  const setPage = useCallback(
    (page: number) => {
      const next = new URLSearchParams(searchParams);
      if (page <= 1) {
        next.delete(pageParam);
      } else {
        next.set(pageParam, String(page));
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams, pageParam],
  );

  /** Reset to page 1 (removes the param from the URL). */
  const resetPage = useCallback(() => {
    setPage(1);
  }, [setPage]);

  /**
   * Given the raw number of rows returned by a SPARQL query (which fetched
   * `pageSize + 1` rows), determine whether more results exist and return
   * only the rows for the current page.
   */
  function paginateRows<T>(rows: T[]): {
    visibleRows: T[];
    hasMore: boolean;
  } {
    const hasMore = rows.length > pageSize;
    const visibleRows = hasMore ? rows.slice(0, pageSize) : rows;
    return { visibleRows, hasMore };
  }

  return {
    currentPage,
    offset,
    limit,
    pageSize,
    setPage,
    resetPage,
    paginateRows,
  };
}
