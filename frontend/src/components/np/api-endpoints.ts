/* Useful predefined API Endpoints used for searching and returning simple uniformly structured results
 */

import { KyResponse } from "ky";

export type ResultItem = {
  uri: string;
  label: string;
  description?: string;
};

export type SearchEndpoint = {
  name: string;
  label: string;
  // The url for the endpoint.  The query string will be appended on the end e.g. "https://api.example.com/search="
  url: string;
  // Should transform the API response to an array of ResultItem
  parser: (res: KyResponse) => Promise<ResultItem[]>;
};

export const NANOPUB_THING_API: SearchEndpoint = {
  name: "nanopubThing",
  label: "NanopubThing",
  url: "https://purl.org/nanopub/api/find_signed_things?type=http%3A%2F%2Fwww.w3.org%2F2002%2F07%2Fowl%23Class&searchterm=",
  parser: async (res: KyResponse) => {
    const text = await res.text();
    // Process SPARQL XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    const results = xmlDoc.getElementsByTagName("result");
    return Array.from(results).map((result) => {
      const uri =
        result.querySelector("binding[name='thing'] uri")?.textContent || "";
      const label =
        result.querySelector("binding[name='label'] literal")?.textContent ||
        uri;
      return { uri, label };
    });
  },
};

export const WIKIDATA_ENTITY_API = {
  name: "wikidata",
  label: "Wikidata",
  url: "https://www.wikidata.org/w/api.php?action=wbsearchentities&language=en&format=json&origin=*&limit=5&search=",
  parser: async (res: KyResponse) => {
    const json = await res.json<{
      search: { concepturi: string; label: string; description: string }[];
    }>();
    // Process Wikidata JSON
    return (json.search || []).map((item) => ({
      uri: item.concepturi,
      label: item.label,
      description: item.description,
    }));
  },
};
