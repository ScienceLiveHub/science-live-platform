// FIXME: This file is mainly a paste of the old plugin and needs fixing

/**
 * Module for searching nanopublications using SPARQL queries
 */
export class NanopubSearch {
  private readonly SPARQL_ENDPOINT = "https://query.petapico.org/repo/full";

  constructor() {
    // ztoolkit?.log("NanopubSearch: Search module created");
  }

  /**
   * Search for nanopublications that mention a DOI
   */
  async searchByDOI(doi: string): Promise<string[]> {
    try {
      ztoolkit.log("Searching for nanopubs mentioning DOI: " + doi);

      // Normalize DOI (remove https://doi.org/ prefix if present)
      let cleanDOI = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
      cleanDOI = cleanDOI.trim();

      ztoolkit.log("Clean DOI: " + cleanDOI);

      // Use the working query pattern
      const query = `
        PREFIX np: <http://www.nanopub.org/nschema#>
        PREFIX npa: <http://purl.org/nanopub/admin/>
        PREFIX dcterms: <http://purl.org/dc/terms/>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        
        SELECT DISTINCT ?np ?date ?authorName
        WHERE {
          ?np a np:Nanopublication ;
              np:hasAssertion ?assertion ;
              np:hasProvenance ?provenance .
          
          GRAPH ?assertion {
            ?s ?p ?o .
            FILTER (
              CONTAINS(LCASE(STR(?s)), LCASE("${cleanDOI}")) ||
              CONTAINS(LCASE(STR(?p)), LCASE("${cleanDOI}")) ||
              CONTAINS(LCASE(STR(?o)), LCASE("${cleanDOI}"))
            )
          }
          
          OPTIONAL {
            GRAPH ?provenance {
              ?np dcterms:created ?date .
              ?np dcterms:creator ?creator .
              ?creator foaf:name ?authorName .
            }
          }
        }
        ORDER BY DESC(?date)
        LIMIT 100
      `;

      ztoolkit.log("SPARQL Query: " + query);

      const results = await this.executeSPARQL(query);
      ztoolkit.log("Found " + results.length + " nanopublications");

      return results;
    } catch (err: any) {
      ztoolkit.log("Failed to search by DOI:", err);
      throw err;
    }
  }

  /**
   * Search for nanopublications that mention a nanopub URI
   */
  async searchByNanopubURI(nanopubUri: string): Promise<string[]> {
    try {
      ztoolkit.log(
        "Searching for nanopubs mentioning nanopub URI: " + nanopubUri,
      );

      const query = `
        PREFIX np: <http://www.nanopub.org/nschema#>
        PREFIX npa: <http://purl.org/nanopub/admin/>
        
        SELECT DISTINCT ?np WHERE {
          ?np a np:Nanopublication ;
              np:hasAssertion ?assertion .
          
          GRAPH ?assertion {
            ?s ?p ?o .
            FILTER (
              CONTAINS(STR(?s), "${nanopubUri}") ||
              CONTAINS(STR(?p), "${nanopubUri}") ||
              CONTAINS(STR(?o), "${nanopubUri}")
            )
          }
          
          # Don't return the nanopub itself
          FILTER(?np != <${nanopubUri}>)
        }
        LIMIT 100
      `;

      const results = await this.executeSPARQL(query);
      ztoolkit.log("Found " + results.length + " nanopublications");

      return results;
    } catch (err: any) {
      ztoolkit.log("Failed to search by nanopub URI:", err);
      throw err;
    }
  }

  /**
   * Search for nanopublications by keyword/title
   */
  async searchByKeywords(keywords: string): Promise<string[]> {
    try {
      ztoolkit.log("Searching for nanopubs with keywords: " + keywords);

      // Clean and prepare search term
      const searchTerm = keywords.trim();

      if (searchTerm.length < 3) {
        ztoolkit.log("Search term too short");
        return [];
      }

      const query = `
        PREFIX np: <http://www.nanopub.org/nschema#>
        PREFIX npa: <http://purl.org/nanopub/admin/>
        PREFIX dcterms: <http://purl.org/dc/terms/>
        
        SELECT DISTINCT ?np ?date WHERE {
          ?np a np:Nanopublication ;
              np:hasAssertion ?assertion .
          
          GRAPH ?assertion {
            ?s ?p ?o .
            FILTER (
              CONTAINS(LCASE(STR(?s)), LCASE("${searchTerm}")) ||
              CONTAINS(LCASE(STR(?p)), LCASE("${searchTerm}")) ||
              CONTAINS(LCASE(STR(?o)), LCASE("${searchTerm}"))
            )
          }
          
          OPTIONAL {
            ?np np:hasProvenance ?provenance .
            GRAPH ?provenance {
              ?np dcterms:created ?date .
            }
          }
        }
        ORDER BY DESC(?date)
        LIMIT 50
      `;

      const results = await this.executeSPARQL(query);
      ztoolkit.log("Found " + results.length + " nanopublications");

      return results;
    } catch (err: any) {
      ztoolkit.log("Failed to search by keywords:", err);
      throw err;
    }
  }

  /**
   * Execute a SPARQL query against the nanopub endpoint
   */
  private async executeSPARQL(query: string): Promise<string[]> {
    try {
      const url = this.SPARQL_ENDPOINT + "?query=" + encodeURIComponent(query);

      ztoolkit.log("Executing SPARQL query...");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/sparql-results+json",
        },
      });

      if (!response.ok) {
        throw new Error(
          "SPARQL query failed: " + response.status + " " + response.statusText,
        );
      }

      const data = (await response.json()) as any;

      // Extract nanopub URIs from results
      const uris: string[] = [];
      if (data.results && data.results.bindings) {
        for (const binding of data.results.bindings) {
          if (binding.np && binding.np.value) {
            uris.push(binding.np.value);
          }
        }
      }

      return uris;
    } catch (err: any) {
      ztoolkit.log("SPARQL execution failed:", err);
      throw err;
    }
  }

  /**
   * Search for nanopublications related to a Zotero item
   * Tries DOI first, then falls back to title keywords
   */
  async searchForItem(item: any): Promise<string[]> {
    try {
      const itemTitle = item.getField("title");
      ztoolkit.log("Searching for nanopubs related to: " + itemTitle);

      // Try DOI first
      const doi = item.getField("DOI");
      if (doi) {
        ztoolkit.log("Item has DOI, searching by DOI: " + doi);
        const results = await this.searchByDOI(doi);
        if (results.length > 0) {
          return results;
        }
        ztoolkit.log("No results by DOI, trying keywords...");
      }

      // Fall back to title keywords
      if (itemTitle) {
        ztoolkit.log("Searching by title keywords");
        return await this.searchByKeywords(itemTitle);
      }

      ztoolkit.log("No DOI or title found for item");
      return [];
    } catch (err: any) {
      ztoolkit.log("Failed to search for item:", err);
      throw err;
    }
  }
}
