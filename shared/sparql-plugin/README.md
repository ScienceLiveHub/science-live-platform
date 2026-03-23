# SPARQL plugin for vite and esbuild

This plugin allows importing .rq SPARQL query files, in either vite or esbuild e.g:

```ts
import SEARCH_QUERY from "./search-query.rq";
```

It also reads any input placeholder parameters mentioned in the .rq file header comment with this format:

```SPARQL
# Search for nanopubs of a specific RDF type.
# Excludes invalidated and superseded nanopubs.
#
# Placeholder: `?_searchTerm` - the user's search string.
# Placeholder: `?_rdfType` - URI: the full type.

select xyz...
```

So for an .rq file you get an imported object with this structure:

```ts
SEARCH_QUERY === {
  content: "select xyz...";
  __placeholders: {
    searchTerm: "string",
    rdfType: "uri"
  };
};
```
