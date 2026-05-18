# SPARQL Queries

These should be defined in [frontend/src/lib/queries](frontend/src/lib/queries). Each query has its own query file \*.rq which must contain a comment that starts with its description at the top and then list its placeholders, then the actual SPARQL content. Example of header comment:

```
# Search for nanopubs of a specific RDF type.
# Excludes invalidated and superseded nanopubs.
#
# Placeholder: `?_searchTerm` - the user's search string.
# Placeholder: `?_rdfType` - URI: the full type.
```

Each query also has a \*.d.ts file which is (re)generated automatically using `npm run generate:query-types` in the frontend workspace. That same npm script will also generate `frontend/src/lib/queries/index.ts` barrel exports for convenient usage. A query can be run (including binding parameters) using functions in `frontend/src/lib/sparql.ts`, usually via `executeBindSparql()`. When using those query execution functions, especially within a React hook that could get run twice in dev mode (React Strict Mode), make sure you implement AbortSignal as per the comment above where `executeBindSparql()` is defined.

## Graphs available

```
graph npa:graph
graph npa:networkGraph
graph ?pubinfo
graph ?assertion
```

The `?pubinfo` `?assertion` graphs are available in the `NANOPUB_SPARQL_ENDPOINT_FULL` endpoint.

The `npa:graph` (Admin) and `npa:networkGraph` are always available, see next sub-section.

## Admin graph

The SPARQL query endpoints provide an admin graph (`npa:graph`) which is an efficient way to query various important properties of nanopubs. Here is an outline of what the admin graph contains, as [csv](https://github.com/knowledgepixels/nanopub-query/blob/main/doc%2Fadmin-triple-table.csv):

```csv
Subject,Predicate,Object,Graph,Group,Comment
NANOPUB,npa:hasValidSignatureForPublicKey,FULL_PUBKEY,npa:graph,meta,full pubkey if signature is valid
NANOPUB,npa:hasValidSignatureForPublicKeyHash,PUBKEY_HASH,npa:graph,meta,hex-encoded SHA256 hash if signature is valid
NANOPUB,npx:signedBy,SIGNER,npa:graph,meta,ID of signer
NANOPUB1,RELATION,NANOPUB2,npa:networkGraph,meta,any inter-nanopub relation found in NANOPUB1
NANOPUB,npx:introduces,THING,npa:graph,meta,when such a triple is present in pubinfo of NANOPUB
NANOPUB,npx:describes,THING,npa:graph,meta,when such a triple is present in pubinfo of NANOPUB
NANOPUB,npx:embeds,THING,npa:graph,meta,when such a triple is present in pubinfo of NANOPUB
NANOPUB,npa:hasSubIri,SUB_IRI,npa:graph,meta,for any IRI minted in the namespace of the NANOPUB
NANOPUB1,npa:refersToNanopub,NANOPUB2,npa:networkGraph,meta,generic inter-nanopub relation
NANOPUB,npx:invalidates,INVALIDATED_NANOPUB,npa:graph,meta,if the NANOPUB retracts or supersedes another nanopub
NANOPUB,npx:retracts,RETRACTED_NANOPUB,npa:graph,meta,if the NANOPUB retracts another nanopub
NANOPUB,npx:supersedes,SUPERSEDED_NANOPUB,npa:graph,meta,if the NANOPUB supersedes another nanopub
NANOPUB,npa:hasHeadGraph,HEAD_GRAPH,npa:graph,meta,direct link to the head graph of the NANOPUB
NANOPUB,npa:hasGraph,GRAPH,npa:graph,meta,generic link to all four graphs of the given NANOPUB
NANOPUB,np:hasAssertion,ASSERTION_GRAPH,npa:graph,meta,direct link to the assertion graph of the NANOPUB
NANOPUB,np:hasProvenance,PROVENANCE_GRAPH,npa:graph,meta,direct link to the provenance graph of the NANOPUB
NANOPUB,np:hasPublicationInfo,PUBINFO_GRAPH,npa:graph,meta,direct link to the pubinfo graph of the NANOPUB
NANOPUB,npa:artifactCode,ARTIFACT_CODE,npa:graph,meta,artifact code starting with 'RA...'
NANOPUB,npa:isIntroductionOf,AGENT,npa:graph,meta,linking intro nanopub to the agent it is introducing
NANOPUB,npa:declaresPubkey,FULL_PUBKEY,npa:graph,meta,full pubkey declared by the given intro NANOPUB
NANOPUB,dct:created,CREATION_DATE,npa:graph,meta,normalized creation timestamp
NANOPUB,npx:hasNanopubType,NANOPUB_TYPE,npa:graph,meta,type of NANOPUB
NANOPUB,rdfs:label,LABEL,npa:graph,meta,label of NANOPUB
NANOPUB,dct:description,LABEL,npa:graph,meta,description of NANOPUB
NANOPUB,dct:creator,CREATOR,npa:graph,meta,creator of NANOPUB (can be several)
NANOPUB,pav:authoredBy,AUTHOR,npa:graph,meta,author of NANOPUB (can be several)
NANOPUB,npa:hasFilterLiteral,FILTER_LITERAL,npa:graph,literal,auxiliary literal for filtering by type and pubkey in text repo
REPO,npa:hasNanopubCount,NANOPUB_COUNT,npa:graph,admin,number of nanopubs loaded
REPO,npa:hasNanopubChecksum,NANOPUB_CHECKSUM,npa:graph,admin,checksum of all loaded nanopubs (order-independent XOR checksum on trusty URIs in Base64 notation)
NANOPUB,npa:hasLoadNumber,LOAD_NUMBER,npa:graph,admin,the sequential number at which this NANOPUB was loaded
NANOPUB,npa:hasLoadChecksum,LOAD_CHECKSUM,npa:graph,admin,the checksum of all loaded nanopubs after loading the given NANOPUB
NANOPUB,npa:hasLoadTimestamp,LOAD_TIMESTAMP,npa:graph,admin,the time point at which this NANOPUB was loaded
```

## Endpoints for query

For normal queries (no text search), always use `NANOPUB_SPARQL_ENDPOINT_FULL` as it provide the most data including access to the assertion, and pubinfo graphs.

For text search queries (Lucene), then `NANOPUB_SPARQL_ENDPOINT_TEXT` must be used instead, however in that case the assertion and pubinfo graphs are not available, not even via the admin graph.

## Title and Full text search (Lucene)

The `/text` endpoint (`NANOPUB_SPARQL_ENDPOINT_TEXT`) supports title and full text search using Lucene Sail:

```
PREFIX search: <http://www.openrdf.org/contrib/lucenesail#>

?subj search:matches [
	      search:query "search terms...";
	      search:property my:property;
	      search:score ?score;
	      search:snippet ?snippet ] .
```

The ‘virtual’ properties in the search: namespace have the following meaning:

- `search:matches` – links the resource to be found with the following query statements (required)
- `search:query` – specifies the Lucene query (required)
- `search:property` – specifies the property to search. If omitted all properties are searched. Use `rdfs:label` for label-only search or `npa:hasFilterLiteral` for full-text search (optional)
- `search:score` – specifies a variable for the score (optional)
- `search:snippet` – specifies a variable for a highlighted snippet (optional)

More details about advanced queries (e.g. field boosting and per-field search) are available here if needed: https://raw.githubusercontent.com/eclipse-rdf4j/rdf4j/refs/heads/main/site/content/documentation/programming/lucene.md
