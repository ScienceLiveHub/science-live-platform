import * as RDFT from "@rdfjs/types";
import { DataFactory, Parser, Quad, Util } from "n3";

const { namedNode } = DataFactory;
const { isNamedNode, isBlankNode: isBlank, isLiteral, prefix } = Util;

// Common Namespaces
export namespace NS {
  export const RDF = prefix("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
  export const RDFS = prefix("http://www.w3.org/2000/01/rdf-schema#");
  export const XSD = prefix("http://www.w3.org/2001/XMLSchema#");
  export const NP = prefix("http://www.nanopub.org/nschema#");
  export const NPT = prefix("http://w3id.org/np/o/ntemplate/");
  export const DCT = prefix("http://purl.org/dc/terms/");
  export const PROV = prefix("http://www.w3.org/ns/prov#");
  export const FOAF = prefix("http://xmlns.com/foaf/0.1/");
}

const { RDF, RDFS, XSD, NP, NPT, DCT, PROV } = NS;

export { Util } from "n3";

export const DEFAULT_PREFIXES: Record<string, string> = {
  rdf: RDF("").value,
  rdfs: RDFS("").value,
  xsd: XSD("").value,
  np: NP("").value,
  ntemplate: NPT("").value,
  dcterms: DCT("").value,
  prov: PROV("").value,
  foaf: "http://xmlns.com/foaf/0.1/",
  schema: "http://schema.org/",
  dc: "http://purl.org/dc/elements/1.1/",
};

/**
 * fetch() the RDF document, parse it (streaming) and run the callback on each quad that it finds.
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
  const res = await fetch(url, {
    headers: {
      Accept: PREFERRED_FORMAT,
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const ct = (res.headers.get("content-type") || "").split(";")[0].trim();
  if (ct != PREFERRED_FORMAT) {
    throw new Error(`Expected content-type ${PREFERRED_FORMAT}, got: ${ct}`);
  }

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

export function termToDisplay(
  term: RDFT.Term | null | undefined,
  prefixes: Record<string, string>,
): { text: string; href?: string } {
  if (!term) return { text: "" };

  if (isNamedNode(term)) {
    const uri = term.value;
    return { text: shrinkUri(uri, prefixes), href: uri };
  }
  if (isLiteral(term)) {
    const val = term.value;
    // const lang = term.lang;
    const dt = term.datatype?.value;
    // if (lang) {
    //   return { text: `"${val}"@${lang}` };
    // }
    if (dt) {
      return { text: `"${val}"^^${shrinkUri(dt, prefixes)}` };
    }
    return { text: `"${val}"` };
  }
  if (isBlank(term)) {
    return { text: `_:${term.value}` };
  }
  return { text: term.value };
}
