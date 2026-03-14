/**
 * SPARQL queries and utilities for querying the nanopub network.
 *
 * Endpoint: https://query.knowledgepixels.com/repo/text
 *   — Supports Lucene full-text search via openrdf lucenesail extensions.
 *
 * Endpoint: https://query.knowledgepixels.com/repo/full
 *   — Standard SPARQL endpoint for structured queries (no full-text search).
 */

import ky from "ky";

export const NANOPUB_SPARQL_ENDPOINT_TEXT =
  "https://query.knowledgepixels.com/repo/text";

export const NANOPUB_SPARQL_ENDPOINT_FULL =
  "https://query.knowledgepixels.com/repo/full";

// =============================================================================
// SPARQL QUERIES
// =============================================================================

/**
 * Full-text search on nanopub labels.
 * Excludes invalidated, superseded, and template nanopubs.
 *
 * Placeholder: `?_searchTerm` — replaced with the user's search string.
 */
export const SEARCH_NANOPUBS = `\
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix np: <http://www.nanopub.org/nschema#>
prefix npa: <http://purl.org/nanopub/admin/>
prefix npx: <http://purl.org/nanopub/x/>
prefix dct: <http://purl.org/dc/terms/>
prefix search: <http://www.openrdf.org/contrib/lucenesail#>
prefix nt: <https://w3id.org/np/o/ntemplate/>

select ?np ?label ?date where {
  graph npa:graph {
    ?np npa:hasValidSignatureForPublicKey ?pubkey .
    filter not exists { ?npx npx:invalidates ?np ; npa:hasValidSignatureForPublicKey ?pubkey . }
    filter not exists { ?npx npx:supersedes ?np ; npa:hasValidSignatureForPublicKey ?pubkey . }
    optional { ?np rdfs:label ?label . }
    ?np dct:created ?date .
  }
  ?np np:hasAssertion ?ag .
  filter not exists { graph ?ag { ?x a nt:AssertionTemplate } }
  ?np search:matches [
    search:query ?_searchTerm ;
    search:property rdfs:label ;
    search:score ?score ] .
} limit 100`;

/**
 * Search for nanopubs of a specific RDF type.
 * Excludes invalidated and superseded nanopubs.
 *
 * Placeholder: `?_searchTerm` — replaced with the user's search string.
 * Placeholder: `?_rdfType` — replaced with the full type URI (angle-bracket wrapped).
 */
export const SEARCH_NANOPUBS_BY_TYPE = `\
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix npa: <http://purl.org/nanopub/admin/>
prefix npx: <http://purl.org/nanopub/x/>

select ?thing ?label where {
  graph ?g {
    ?thing a ?_rdfType .
  }
  optional {
    graph ?g2 {
      ?thing rdfs:label ?label .
    }
  }
  filter(
    contains(lcase(str(?thing)), ?_searchTerm)
    || contains(lcase(str(?label)), ?_searchTerm)
  )
} limit 10`;

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

/**
 * Substitute a placeholder in a SPARQL query with a quoted string literal.
 * Escapes double quotes in the value.
 */
export function sparqlBindString(
  query: string,
  placeholder: string,
  value: string,
): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return query.replaceAll(placeholder, `"${escaped}"`);
}

/**
 * Substitute a placeholder in a SPARQL query with a URI (wrapped in angle brackets).
 */
export function sparqlBindUri(
  query: string,
  placeholder: string,
  uri: string,
): string {
  return query.replaceAll(placeholder, `<${uri}>`);
}
