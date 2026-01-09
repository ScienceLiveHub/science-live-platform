import * as RDFT from "@rdfjs/types";
import ky from "ky";
import { DataFactory, NamedNode, Parser, Quad, Store, Term, Util } from "n3";
import { getNanopubHash, getUriEnd } from "./utils";

const { namedNode } = DataFactory;
const { isNamedNode, isBlankNode: isBlank, isLiteral, prefix } = Util;

/**
 * Convenience functions for working with RDF data using n3
 *
 */

// Common Namespaces
export namespace NS {
  export const RDF = prefix("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
  export const RDFS = prefix("http://www.w3.org/2000/01/rdf-schema#");
  export const XSD = prefix("http://www.w3.org/2001/XMLSchema#");
  export const NP = prefix("http://www.nanopub.org/nschema#");
  export const NPT = prefix("http://w3id.org/np/o/ntemplate/");
  export const NPTs = prefix("https://w3id.org/np/o/ntemplate/");
  export const NPX = prefix("http://purl.org/nanopub/x/");
  export const DCT = prefix("http://purl.org/dc/terms/");
  export const PROV = prefix("http://www.w3.org/ns/prov#");
  export const FOAF = prefix("http://xmlns.com/foaf/0.1/");
}

const { RDF, RDFS, XSD, NP, NPT, NPX, DCT, PROV, FOAF } = NS;

export { Util } from "n3";

export const DEFAULT_PREFIXES: Record<string, string> = {
  rdf: RDF("").value,
  rdfs: RDFS("").value,
  xsd: XSD("").value,
  np: NP("").value,
  ntemplate: NPT("").value,
  dcterms: DCT("").value,
  prov: PROV("").value,
  foaf: FOAF("").value,
  schema: "http://schema.org/",
  dc: "http://purl.org/dc/elements/1.1/",
};

const problematicHosts = ["https://purl.org", "http://purl.org"];

/**
 * fetch the RDF document, parse it (streaming) and run the callback on each quad that it finds.
 *
 */
export async function fetchQuads(
  url: string,
  quadCallback: (quad: Quad) => void,
  prefixCallback?: (prefix: string, prefixNode: RDFT.NamedNode) => void,
) {
  // TODO: does it need to be this specific format?
  const PREFERRED_FORMAT = "application/trig";

  // Download RDF
  let res = await ky(url, {
    headers: {
      Accept: PREFERRED_FORMAT,
    },
    redirect: "follow",
    retry: 2,
  }).catch(async () => {
    // Some hosts (e.g. purl.org) dont support CORS headers for calling from js clients in the browser
    // For those, retry getting the trig directly from known working servers
    if (problematicHosts.some((host) => url.startsWith(host))) {
      const hash = getNanopubHash(url);
      if (hash) {
        url = `https://registry.knowledgepixels.com/np/${hash}.trig`;
        return await ky(url, {
          headers: {
            Accept: PREFERRED_FORMAT,
          },
        });
      }
    }
  });
  if (res) {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    const ct = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (ct != PREFERRED_FORMAT) {
      throw new Error(`Expected content-type ${PREFERRED_FORMAT}, got: ${ct}`);
    }

    parseRdf(text, quadCallback, prefixCallback);
  }
}

/**
 * Parse the RDF string and run the callback on each quad that it finds.
 *
 */
export async function parseRdf(
  text: string,
  quadCallback: (quad: Quad) => void,
  prefixCallback?: (prefix: string, prefixNode: RDFT.NamedNode) => void,
) {
  // Parse the RDF and run the provided callback on each loaded quad, and optionally each prefix
  const parser = new Parser();
  parser.parse(
    text,
    (error: any, quad: Quad) => {
      if (error) {
        throw new Error(
          `N3 Failed to parse RDF, make sure it is in the TRiG format. ${error}`,
        );
      }
      if (quad) {
        quadCallback(quad);
      }
    },
    (prefix: string, prefixNode: RDFT.NamedNode) => {
      prefixCallback?.(prefix, prefixNode);
    },
  );
}

/**
 * Publish the (already signed) nanopub RDF to the server
 * Defaults to a production server.
 *
 * e.g. Prod: https://registry.knowledgepixels.com/
 * e.g. Test: https://test.registry.knowledgepixels.com/np/ (TEST_NANOPUB_REGISTRY_URL)
 * Currently, publishing to the test server validates the RDF and returns OK but the
 * nanopub isnt created on the network.  This may change in future.
 *
 */
export async function publishRdf(
  rdf: string,
  server: string = "https://registry.knowledgepixels.com/",
): Promise<{ response: Response }> {
  const res = await ky(server, {
    method: "POST",
    headers: { "Content-Type": "application/trig" },
    body: rdf,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Nanopub publish failed: ${res.status} ${res.statusText}\n${text}`,
    );
  }

  return { response: res };
}

/**
 * fetch a list of from a remote RDF document (e.g. values for a combobox or multi choice).
 *
 */
export async function fetchPossibleValuesFromQuads(url: string) {
  const options: { name: string; description: string; uri?: string }[] = [];

  await fetchQuads(url, (q) => {
    if (
      q.predicate.equals(NS.RDFS("label")) &&
      getUriEnd(q.graph.value) === "assertion"
    ) {
      options.push({
        name: q.subject.value,
        description: q.object.value,
        uri: q.subject.value, // TODO: is there any point if name is the same?
      });
    }
  });
  return options;
}

// export type Store = N3Store;
export type Statement = RDFT.Quad;

export function groupByGraph(
  statements: Statement[],
): Map<string, Statement[]> {
  const m = new Map<string, Statement[]>();
  for (const st of statements) {
    const gTerm = (st as any).graph;
    const g =
      gTerm &&
      (gTerm.termType === "NamedNode" || gTerm.termType === "BlankNode")
        ? gTerm.value
        : "default";
    if (!m.has(g)) m.set(g, []);
    m.get(g)!.push(st);
  }
  return m;
}

export function shrinkUri(
  uri: string,
  prefixes: Record<string, string>,
): string {
  let bestPrefix: string | null = null;
  let bestBase = "";
  for (const [pfx, base] of Object.entries(prefixes)) {
    if (uri.startsWith(base) && base.length > bestBase.length) {
      bestBase = base;
      bestPrefix = pfx;
    }
  }
  if (bestPrefix) {
    return `${bestPrefix}:${uri.substring(bestBase.length)}`;
  }
  return uri;
}

/**
 * Extract all the properties of a subject from the graph (properties as string values, or nodes if returnNodes = true).
 *
 * - Supports multiple predicates mapping to the same property (hence predicates are specified in an array).
 * - Supports strings and arrays of strings for properties (props with the suffix `_$array` are treated as arrays).
 *
 * TODO: there is a chance that if multiple props with same name are found, only one will be opaquely returned.
 *
 * Property mapping example:
 *
 *   const propertyMap = {
 *     name: [NS.RDFS("label")],
 *     description: [NS.DCT("description")],
 *     types_$array: [NS.RDF("type")],
 *     statements_$array: [NS.NPT("includes"), NS.NPT("hasStatement")],
 *     targetNanopubType: [NS.NPT("hasTargetNanopubType")],
 *     labelPattern: [NS.NPT("hasNanopubLabelPattern")],
 *     tags_$array: [NS.NPT("hasTag")],
 *   };
 */

export function extractSubjectProps(
  store: Store,
  sub: NamedNode,
  propertyMap: Record<string, (NamedNode | ((q: Quad) => boolean))[]>,
  graphUri?: string | null,
  returnNodes = false,
) {
  const outputObj: any = {};
  store.forEach((quad) => {
    if (!graphUri || quad.graph.value === graphUri) {
      if (quad.subject.equals(sub)) {
        const mappedKey = Object.entries(propertyMap).find(([k, maps]) => {
          return maps.some((map) => {
            if (typeof map === "function") {
              return map(quad as Quad);
            } else {
              return termsAreEqual(quad.predicate as Term, map);
            }
          });
        });
        let key = mappedKey?.[0] ?? quad.predicate.value;
        if (key.endsWith("_$array")) {
          key = key.replace("_$array", "");
          if (!outputObj[key]) {
            outputObj[key] = [];
          }
          outputObj[key].push(returnNodes ? quad.object : quad.object.value);
        } else {
          outputObj[key] = returnNodes ? quad.object : quad.object.value;
        }
      }
    }
  });
  return outputObj;
}

/**
 * Extract all the subjects (optionally filtering for specified predicate/object/graph), and their properties.
 *
 * Uses property mappings from above, and url `#fragment` for subject names where available (e.g. [URL]/#assertion -> "assertion" )
 *
 */
export function extractSubjects(
  store: Store,
  propertyMap: Record<string, (NamedNode | ((q: Quad) => boolean))[]>,
  predicate?: string | null,
  object?: string | null,
  graphUri?: string | null,
  returnNodes = false,
) {
  const outputObj: Map<string, any> = new Map();
  store.forSubjects(
    (sub) => {
      // let fragment = getUriFragment(sub.value);
      outputObj.set(
        /*fragment ??*/ sub.value,
        extractSubjectProps(
          store,
          namedNode(sub.value),
          propertyMap,
          undefined,
          returnNodes,
        ),
      );
    },
    predicate ?? null,
    object ?? null,
    graphUri ? namedNode(graphUri) : null,
  );
  return outputObj;
}
/**
 * Similar to extractSubjects() above but filter using a function.
 *
 */
export function extractSubjectsFiltered(
  store: Store,
  propertyMap: Record<string, (NamedNode | ((q: Quad) => boolean))[]>,
  filter: (q: RDFT.Quad) => boolean,
  graphUri?: string | null,
  returnNodes = false,
) {
  const outputObj: Map<string, any> = new Map();

  const filtered = store
    .filter(filter)
    ?.toArray()
    .map((q) => q.subject.value);

  filtered?.forEach((sub) => {
    outputObj.set(
      sub,
      extractSubjectProps(
        store,
        namedNode(sub),
        propertyMap,
        graphUri,
        returnNodes,
      ),
    );
  });

  return outputObj;
}

/**
 * Compare terms for equality, ignoring http/https
 * TODO: this is not a good solution. Ideally the templates and nanopubs which miss-use http/https should be fixed
 */
export function termsAreEqual(a: Term, b: Term) {
  const a_id = a?.id?.replace("https://", "http://");
  const a_value = a?.value?.replace("https://", "http://");
  const b_id = b?.id?.replace("https://", "http://");
  const b_value = b?.value?.replace("https://", "http://");
  return a?.termType === b?.termType && a_id === b_id && a_value === b_value;
}
