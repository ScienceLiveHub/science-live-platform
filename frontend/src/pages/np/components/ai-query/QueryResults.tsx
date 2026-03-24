/**
 * Component to display SPARQL query results.
 */

import { Button } from "@/components/ui/button";
import { executeSparql, NANOPUB_SPARQL_ENDPOINT_TEXT } from "@/lib/sparql";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { QueryResultItem } from "./types";

interface QueryResultsProps {
  /** The SPARQL query to execute */
  query: string | null;
  /** Whether to auto-execute when query changes */
  autoExecute?: boolean;
  /** Callback when results are loaded */
  onResults?: (results: QueryResultItem[] | null) => void;
  /** Callback when an error occurs */
  onError?: (error: string | null) => void;
}

export function QueryResults({
  query,
  autoExecute = false,
  onResults,
  onError,
}: QueryResultsProps) {
  const [results, setResults] = useState<QueryResultItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs for the AbortController and callbacks to avoid dependency-triggered re-renders.
  // This prevents the infinite loop where setAbortController -> new executeQuery -> useEffect re-fires.
  const abortControllerRef = useRef<AbortController | null>(null);
  const onResultsRef = useRef(onResults);
  const onErrorRef = useRef(onError);

  // Keep callback refs up to date
  onResultsRef.current = onResults;
  onErrorRef.current = onError;

  const executeQuery = useCallback(
    async (sparqlQuery: string, signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await executeSparql(
          sparqlQuery,
          NANOPUB_SPARQL_ENDPOINT_TEXT,
          signal,
        );

        // Don't update state if this request was aborted
        if (signal?.aborted) return;

        setResults(data);
        onResultsRef.current?.(data);
        onErrorRef.current?.(null);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Query execution failed";
        setError(message);
        setResults(null);
        onResultsRef.current?.(null);
        onErrorRef.current?.(message);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [], // No dependencies — uses refs for callbacks, signal passed as argument
  );

  // Auto-execute when autoExecute is true and query is present.
  // The AbortController is created inside the effect and cleaned up on unmount/re-run,
  // following the pattern recommended in sparql.ts for React Strict Mode compatibility.
  useEffect(() => {
    if (!autoExecute || !query) return;

    // Cancel any previous in-flight request
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    executeQuery(query, controller.signal);

    return () => {
      controller.abort();
    };
  }, [query, autoExecute, executeQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleExecute = () => {
    if (!query) return;

    // Cancel any previous in-flight request
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    executeQuery(query, controller.signal);
  };

  // Get column headers from the first result
  const columns = results?.[0] ? Object.keys(results[0]) : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      {!autoExecute && query && (
        <div className="flex items-center gap-2">
          <Button onClick={handleExecute} disabled={isLoading || !query}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Executing...
              </>
            ) : (
              "Execute Query"
            )}
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Executing query...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div>
              <div className="font-medium text-destructive">Query Error</div>
              <div className="text-sm text-muted-foreground mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && results?.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No results found for this query.
        </div>
      )}

      {/* Results table */}
      {!isLoading && results && results.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-sm text-muted-foreground">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2 text-left font-medium text-muted-foreground"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-2">
                        {isUrl(row[col]) ? (
                          <a
                            href={row[col]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {truncateUrl(row[col])}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          row[col]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No query state */}
      {!query && !isLoading && !results && !error && (
        <div className="text-center py-8 text-muted-foreground">
          Generate a SPARQL query to see results.
        </div>
      )}
    </div>
  );
}

/**
 * Check if a string is a URL
 */
function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Truncate a URL for display
 */
function truncateUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength / 2) + "..." + url.slice(-maxLength / 2);
}
