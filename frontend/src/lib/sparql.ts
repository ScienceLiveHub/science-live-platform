/**
 * SPARQL queries and utilities for querying the nanopub network.
 *
 * Endpoint: https://query.knowledgepixels.com/repo/text
 *   — Supports Lucene full-text search via openrdf lucenesail extensions.
 *
 * Endpoint: https://query.knowledgepixels.com/repo/full
 *   — Standard SPARQL endpoint for structured queries (no full-text search).
 */

import SEARCH_NANOPUBS_BY_TYPE from "./queries/search-nanopubs-by-type.rq";
import SEARCH_NANOPUBS from "./queries/search-nanopubs.rq";
import USERS_LATEST_NANOPUBS from "./queries/users-latest.rq";

import ky from "ky";

export const NANOPUB_SPARQL_ENDPOINT_TEXT =
  "https://query.knowledgepixels.com/repo/text";

export const NANOPUB_SPARQL_ENDPOINT_FULL =
  "https://query.knowledgepixels.com/repo/full";

export { SEARCH_NANOPUBS, SEARCH_NANOPUBS_BY_TYPE, USERS_LATEST_NANOPUBS };

// =============================================================================
// TYPED SPARQL QUERY TYPES
// =============================================================================

/**
 * Placeholder type kinds for SPARQL query parameters.
 * - "uri": URI wrapped in angle brackets (<uri>)
 * - "literal": Quoted string literal with escaping ("value")
 * - "raw": Raw substitution with no escaping (e.g. numeric values, use with caution)
 */
export type PlaceholderKind = "uri" | "literal" | "raw";

/**
 * A SPARQL query object with content and typed placeholder information.
 * T is a map from placeholder name to its expected type kind.
 */
export type SparqlQuery<
  T extends Record<string, PlaceholderKind> = Record<string, never>,
> = {
  readonly content: string;
  readonly __placeholders?: T;
};

/**
 * Extract placeholder names from a SparqlQuery type.
 */
export type PlaceholderNames<Q> =
  Q extends SparqlQuery<infer T> ? keyof T : never;

/**
 * Build the values object type for a query's placeholders.
 * Each placeholder maps to its expected value type (always string at runtime).
 */
export type SparqlValues<Q, Required extends boolean = false> =
  Q extends SparqlQuery<infer T>
    ? Required extends true
      ? { [K in keyof T]: string }
      : Partial<{ [K in keyof T]: string }>
    : never;

// =============================================================================
// QUERY EXECUTION
// =============================================================================

type SparqlBindingValue = {
  type: string;
  value: string;
  datatype?: string;
};

type SparqlResults = {
  results: {
    bindings: Record<string, SparqlBindingValue>[];
  };
};

/**
 * Execute a SPARQL query against the nanopub network.
 *
 * @param query     The SPARQL query string (with placeholders already substituted).
 * @param endpoint  The SPARQL endpoint URL (defaults to text endpoint for full-text search).
 */
export async function executeSparql(
  query: string,
  endpoint: string = NANOPUB_SPARQL_ENDPOINT_TEXT,
): Promise<Record<string, string>[]> {
  const res = await ky.post(endpoint, {
    body: new URLSearchParams({ query }),
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const data = await res.json<SparqlResults>();

  return data.results.bindings.map((row) => {
    const parsed: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      parsed[k] = v.value;
    }
    return parsed;
  });
}

// =============================================================================
// PLACEHOLDER SUBSTITUTION
// =============================================================================

/**
 * Format a value for SPARQL based on its placeholder kind.
 */
function formatValue(kind: PlaceholderKind, value: string): string {
  switch (kind) {
    case "uri":
      return `<${value}>`;
    case "literal": {
      const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `"${escaped}"`;
    }
    case "raw":
      return value;
  }
}

/**
 * Substitute placeholders in a SPARQL query with typed values.
 *
 * The values object is type-checked against the query's placeholder definitions.
 * Each placeholder is formatted according to its declared type:
 * - "uri": Wrapped in angle brackets (<uri>)
 * - "literal": Quoted string with escaping ("value")
 * - "raw": No modification
 *
 * @example
 * ```ts
 * // USERS_LATEST_NANOPUBS has placeholder "?_orcidUri": "uri"
 * const query = sparqlBind(USERS_LATEST_NANOPUBS, {
 *   orcidUri: "https://orcid.org/0000-0000-0000-0000"
 * });
 *
 * // SEARCH_NANOPUBS has placeholder "?_searchTerm": "literal"
 * const query = sparqlBind(SEARCH_NANOPUBS, {
 *   searchTerm: "my search term"
 * });
 *
 * // SEARCH_NANOPUBS_BY_TYPE has both types
 * const query = sparqlBind(SEARCH_NANOPUBS_BY_TYPE, {
 *   searchTerm: "my search",
 *   rdfType: "http://example.org/Type"
 * });
 * ```
 */
export function sparqlBind<T extends Record<string, PlaceholderKind>>(
  query: SparqlQuery<T>,
  values: Partial<{ [K in keyof T]: string }>,
): string {
  let result = query.content;
  for (const [placeholder, value] of Object.entries(values) as [
    keyof T & string,
    string,
  ][]) {
    const kind = query.__placeholders?.[placeholder];
    if (kind) {
      result = result.replaceAll(`?_${placeholder}`, formatValue(kind, value));
    }
  }
  return result;
}

/**
 * Substitute all placeholders in a SPARQL query (all required values must be provided).
 * Same as sparqlBind but enforces that all placeholders have values.
 */
export function sparqlBindAll<T extends Record<string, PlaceholderKind>>(
  query: SparqlQuery<T>,
  values: { [K in keyof T]: string },
): string {
  return sparqlBind(query, values);
}

/**
 * Bind placeholders in a SPARQL query and execute it in a single call.
 *
 * This is a convenience function that combines `sparqlBind` and `executeSparql`.
 *
 * @example
 * ```ts
 * // Bind and execute in one call
 * const results = await executeBindSparql(USERS_LATEST_NANOPUBS, {
 *   orcidUri: "https://orcid.org/0000-0000-0000-0000"
 * });
 *
 * // With custom endpoint
 * const results = await executeBindSparql(
 *   SEARCH_NANOPUBS,
 *   { searchTerm: "my search" },
 *   NANOPUB_SPARQL_ENDPOINT_FULL
 * );
 * ```
 */
export async function executeBindSparql<
  T extends Record<string, PlaceholderKind>,
>(
  query: SparqlQuery<T>,
  values: Partial<{ [K in keyof T]: string }>,
  endpoint: string = NANOPUB_SPARQL_ENDPOINT_TEXT,
): Promise<Record<string, string>[]> {
  const boundQuery = sparqlBind(query, values);
  return executeSparql(boundQuery, endpoint);
}
