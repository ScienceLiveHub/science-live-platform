import * as $rdf from "rdflib";

// Namespaces
const RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
const RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
const XSD = $rdf.Namespace("http://www.w3.org/2001/XMLSchema#");
const NP = $rdf.Namespace("http://www.nanopub.org/nschema#");
const NPT = $rdf.Namespace("http://w3id.org/np/o/ntemplate/");
const DCT = $rdf.Namespace("http://purl.org/dc/terms/");
const PROV = $rdf.Namespace("http://www.w3.org/ns/prov#");

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

export async function loadNanopub(
  uri: string,
  setStore: (st: $rdf.Formula) => void
) {
  // Fresh store for each load
  const st = $rdf.graph();

  // Using `application/ld+json` or Turtle (default) would be nicer but maybe nanopubs don't
  // always conform to the expected W3C spec when returning multiple graphs in one file, and
  // rdflib doesnt parse all four graphs, only the Head.
  // The `application/n-quads` format does work for multiple graphs, since all of the other
  // graphs are flattened to one level with the fourth quad element specifying which graph it is.
  const PREFERRED_FORMAT = "application/n-quads";

  const res = await fetch(uri, {
    headers: {
      Accept: PREFERRED_FORMAT,
    },
  });

  // NOTE: I cannot get rdflib `fetcher.load` to work, so resort to always manually download via built-in `fetch()`

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const text = await res.text();

  const ct = (res.headers.get("content-type") || "").split(";")[0].trim();
  if (ct != PREFERRED_FORMAT) {
    throw new Error(`Expected content-type ${PREFERRED_FORMAT}, got: ${ct}`);
  }
  $rdf.parse(text, st, uri, PREFERRED_FORMAT, (e, kb: $rdf.Formula | null) => {
    if (e) {
      throw e;
    }
    if (kb) {
      setStore(kb);
    }
    //   setCurrentUri(uri);
  });
}
export type Statement = $rdf.Statement;
export type Store = $rdf.Store;

type GraphUris = {
  head?: string;
  assertion?: string;
  provenance?: string;
  pubinfo?: string;
};

type Metadata = {
  created?: string | null;
  creators?: string[];
  types?: string[];
  title?: string | null;
};

export function groupByGraph(
  statements: Statement[]
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

export function extractGraphUris(store: $rdf.IndexedFormula): GraphUris {
  // Find head graph containing np:hasAssertion/Provenance/PubInfo
  const assertionSts = store.match(
    undefined,
    NP("hasAssertion"),
    undefined,
    undefined
  );

  const provenanceSts = store.match(
    undefined,
    NP("hasProvenance"),
    undefined,
    undefined
  );

  const pubinfoSts = store.match(
    undefined,
    NP("hasPublicationInfo"),
    undefined,
    undefined
  );

  const headTerm =
    assertionSts[0]?.graph || provenanceSts[0]?.graph || pubinfoSts[0]?.graph;

  const uris: GraphUris = {};
  if (
    headTerm &&
    (headTerm.termType === "NamedNode" || headTerm.termType === "BlankNode")
  ) {
    uris.head = headTerm.value;
  }
  if (assertionSts[0] && isNamedNode(assertionSts[0].object)) {
    uris.assertion = assertionSts[0].object.value;
  }
  if (provenanceSts[0] && isNamedNode(provenanceSts[0].object)) {
    uris.provenance = provenanceSts[0].object.value;
  }
  if (pubinfoSts[0] && isNamedNode(pubinfoSts[0].object)) {
    uris.pubinfo = pubinfoSts[0].object.value;
  }
  return uris;
}

export function extractMetadata(
  store: $rdf.IndexedFormula,
  graphUris: GraphUris
): Metadata {
  // Prefer pubinfo graph for created/creator/etc., else any
  const g = graphUris.pubinfo ? $rdf.sym(graphUris.pubinfo) : undefined;

  const createdLit = store.anyStatementMatching(
    undefined,
    DCT("created"),
    undefined,
    g
  ) as $rdf.Statement | null;

  const creators = store
    .statementsMatching(undefined, DCT("creator"), undefined, g)
    .map((t) => {
      const tval = t.object.value;
      return [tval];
    })
    .flat()
    .filter(Boolean) as string[];

  // Also check prov:wasAttributedTo in provenance
  const provCreators = store
    .each(
      undefined,
      PROV("wasAttributedTo"),
      undefined,
      graphUris.provenance ? $rdf.sym(graphUris.provenance) : undefined
    )
    .map((t) => (isNamedNode(t) ? t.value : t.value));

  const titles = store
    .each(undefined, DCT("title"), undefined, g)
    .map((t) => (isLiteral(t) ? t.value : t.value));

  // Any nanopublication type?
  const npTypes = store
    .statementsMatching(
      undefined,
      RDF("type"),
      NP("Nanopublication"),
      graphUris.head ? $rdf.sym(graphUris.head) : undefined
    )
    .map((t) => (isNamedNode(t) ? t.object.value : t.object.value));

  const uniq = (arr: string[]) => Array.from(new Set(arr));

  return {
    created: createdLit?.object ? createdLit.object.value : null,
    creators: uniq([...(creators || []), ...(provCreators as string[])]),
    types: uniq(npTypes),
    title: titles[0] || null,
  };
}

function isNamedNode(t: any | null | undefined): t is $rdf.NamedNode {
  return !!t && (t as any).termType === "NamedNode";
}

function isLiteral(t: any | null | undefined): t is $rdf.Literal {
  return !!t && (t as any).termType === "Literal";
}

function isBlank(t: any | null | undefined): t is $rdf.BlankNode {
  return !!t && (t as any).termType === "BlankNode";
}

export function shrinkUri(
  uri: string,
  prefixes: Record<string, string>
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
  term: any | null | undefined,
  prefixes: Record<string, string>
): { text: string; href?: string } {
  if (!term) return { text: "" };

  if (isNamedNode(term)) {
    const uri = term.value;
    return { text: shrinkUri(uri, prefixes), href: uri };
  }
  if (isLiteral(term)) {
    const val = term.value;
    const lang = term.lang;
    const dt = term.datatype?.value;
    if (lang) {
      return { text: `"${val}"@${lang}` };
    }
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
