/**
 * SPARQL queries used by the /api/np endpoints.
 *
 * These are inline string copies of the canonical .rq files in
 * `frontend/src/lib/queries/` (and `forrt-replication-template/scripts/queries/`).
 * Until the wrangler build is configured to use the shared
 * `@sciencelive/sparql-plugin/esbuild` loader, mirror any upstream edit here.
 *
 * Single source of truth: `frontend/src/lib/queries/*.rq`.
 */

export const NANOPUB_SPARQL_ENDPOINT_FULL =
  "https://query.knowledgepixels.com/repo/full";

/**
 * Source: frontend/src/lib/queries/nanopub-references.rq
 * Returns nanopubs that REFER TO ?_nanopubUri (upstream / incoming edges).
 */
export const REFERENCES_TO = `
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix np: <http://www.nanopub.org/nschema#>
prefix npa: <http://purl.org/nanopub/admin/>
prefix npx: <http://purl.org/nanopub/x/>
prefix dct: <http://purl.org/dc/terms/>
prefix nt: <https://w3id.org/np/o/ntemplate/>

select ?np ?label ?date ?creator ?template where {
  graph npa:networkGraph {
    ?np npa:refersToNanopub ?_nanopubUri .
  }
  graph npa:graph {
    ?np npa:hasValidSignatureForPublicKeyHash ?pubkey .
    filter not exists { ?npx npx:invalidates ?np ; npa:hasValidSignatureForPublicKeyHash ?pubkey . }
    filter not exists { ?np npx:invalidates ?_nanopubUri . }
    optional { ?np rdfs:label ?label . }
    ?np np:hasAssertion ?assertion ;
        dct:created ?date ;
        dct:creator ?creator .
  }
  filter not exists { graph ?assertion { ?_nanopubUri rdfs:comment ?_s . } }
  filter not exists { graph ?assertion { ?approver npx:approvesOf ?_nanopubUri . } }
  filter not exists { graph ?assertion { ?disapprover npx:disapprovesOf ?_nanopubUri . } }
  optional { graph npa:networkGraph { ?np nt:wasCreatedFromTemplate ?template . } }
}
order by desc(?date)
limit 100
`;

/**
 * Source: forrt-replication-template/scripts/queries/references-from.rq
 * Returns nanopubs that ?_nanopubUri REFERS TO (downstream / outgoing edges).
 */
export const REFERENCES_FROM = `
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix np: <http://www.nanopub.org/nschema#>
prefix npa: <http://purl.org/nanopub/admin/>
prefix npx: <http://purl.org/nanopub/x/>
prefix dct: <http://purl.org/dc/terms/>
prefix nt: <https://w3id.org/np/o/ntemplate/>

select ?np ?label ?date ?creator ?template where {
  graph npa:networkGraph {
    ?_nanopubUri npa:refersToNanopub ?np .
  }
  graph npa:graph {
    ?np npa:hasValidSignatureForPublicKeyHash ?pubkey .
    filter not exists { ?npx npx:invalidates ?np ; npa:hasValidSignatureForPublicKeyHash ?pubkey . }
    filter not exists { ?np npx:invalidates ?_nanopubUri . }
    optional { ?np rdfs:label ?label . }
    ?np np:hasAssertion ?assertion ;
        dct:created ?date ;
        dct:creator ?creator .
  }
  filter not exists { graph ?assertion { ?_nanopubUri rdfs:comment ?_s . } }
  filter not exists { graph ?assertion { ?approver npx:approvesOf ?_nanopubUri . } }
  filter not exists { graph ?assertion { ?disapprover npx:disapprovesOf ?_nanopubUri . } }
  optional { graph npa:networkGraph { ?np nt:wasCreatedFromTemplate ?template . } }
}
order by desc(?date)
limit 100
`;

/**
 * Source: frontend/src/lib/queries/aida-statement-nanopub.rq
 * Returns the nanopub(s) that assert a given AIDA-statement IRI
 * (`http://purl.org/aida/<sentence>`), i.e. the AIDA Sentence nanopub.
 *
 * A FORRT Claim links to its AIDA only through this shared statement IRI
 * (`sciencelive:asAidaStatement <aida-IRI>`), never by the AIDA's nanopub URI.
 * So neither the `npa:refersToNanopub` index nor TriG URI-mining can reach the
 * AIDA nanopub from the Claim — without this query the constellation walk stops
 * at the Claim and the upstream AIDA + Quote never surface.
 */
export const AIDA_STATEMENT_NANOPUB = `
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix np: <http://www.nanopub.org/nschema#>
prefix npa: <http://purl.org/nanopub/admin/>
prefix npx: <http://purl.org/nanopub/x/>
prefix dct: <http://purl.org/dc/terms/>
prefix nt: <https://w3id.org/np/o/ntemplate/>
prefix hycl: <http://purl.org/petapico/o/hycl#>

select ?np ?label ?date ?creator ?template where {
  graph npa:graph {
    ?np npa:hasValidSignatureForPublicKeyHash ?pubkey .
    filter not exists { ?npx npx:invalidates ?np ; npa:hasValidSignatureForPublicKeyHash ?pubkey . }
    optional { ?np rdfs:label ?label . }
    ?np np:hasAssertion ?assertion ;
        dct:created ?date ;
        dct:creator ?creator .
  }
  graph ?assertion {
    ?_aidaStatementIri a hycl:AIDA-Sentence .
  }
  optional { graph npa:networkGraph { ?np nt:wasCreatedFromTemplate ?template . } }
}
order by desc(?date)
limit 100
`;

/**
 * Substitute a `?_…` placeholder with a bracketed URI literal. Defaults to the
 * `?_nanopubUri` placeholder used by the reference queries; pass an explicit
 * placeholder for other queries (e.g. `?_aidaStatementIri`).
 */
export function bindUri(
  query: string,
  uri: string,
  placeholder = "?_nanopubUri",
): string {
  return query.replaceAll(placeholder, `<${uri}>`);
}
