import { fetchQuads, NS, shrinkUri, Statement } from "@/lib/rdf";
import { DataFactory, Store as N3Store, NamedNode, Quad, Term, Util } from "n3";

const { namedNode } = DataFactory;
const { isNamedNode } = Util;
const { RDF, RDFS, XSD, NP, NPT, DCT, PROV, FOAF } = NS;

type GraphUris = {
  head?: string;
  assertion?: string;
  provenance?: string;
  pubinfo?: string;
};

export type Metadata = {
  created?: string | null;
  creators?: string[];
  title?: string | null;
  assertionSubjects?: any[];
  uri?: string;
};

export const COMMON_LABELS: Record<string, string> = {
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": "is a",
  "https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate":
    "was created from template",
  "https://w3id.org/np/o/ntemplate/wasCreatedFromProvenanceTemplate":
    "was created from Provenance template",
  "https://w3id.org/np/o/ntemplate/wasCreatedFromPubinfoTemplate":
    "was created from Pubinfo template",
  "http://purl.org/nanopub/x/hasAlgorithm": "has signature algorithm",
  "http://purl.org/nanopub/x/hasPublicKey": "has public key",
  "http://purl.org/nanopub/x/hasSignature": "has signature",
  "http://purl.org/nanopub/x/hasSignatureTarget": "has signature target",
  "http://purl.org/nanopub/x/signedBy": "was signed by",
  "http://xmlns.com/foaf/0.1/name": "is named",
  "http://purl.org/dc/terms/creator": "was created by",
  "http://purl.org/dc/terms/created": "was created at",
  "http://purl.org/dc/terms/license": "has license",
  "http://www.w3.org/2000/01/rdf-schema#label": "is labeled",
  "http://purl.org/nanopub/x/hasNanopubType": "is a nanopub of type",
  "http://purl.org/nanopub/x/wasCreatedAt": "is a nanopub created at",
  "http://www.w3.org/2000/01/rdf-schema#comment": "has the quote or comment",
  "http://purl.org/spar/cito/includesQuotationFrom":
    "includes quotation(s) from",
};

/**
 * This class adds some dev-friendly convenience on top of the specs-compatible N3.Store.
 *
 * TODO: Much of it is specific to Nanopublications, so consider renaming it to NanopubStore
 *       and conform to Nanopublications spec.
 *
 */
export class Store extends N3Store {
  // Store a map of URIs and their "friendly" labels, which could include both internal or external
  private labelCache: Record<string, string> = {};

  graphUris: GraphUris = {};
  metadata: Metadata = {};
  prefixes: Record<string, string> = {};

  /**
   * Load a Nanopublication from a given URL
   *
   * (Technically this will load any RDF given a URL, not just nanopubs)
   *
   */
  static async loadNanopub(
    url: string,
    setStore: (store: Store, prefixes?: any) => void,
  ) {
    const store = new Store();
    const prefixes: any = {}; // TODO: save prefixes to the object
    await fetchQuads(
      url,
      (quad) => store.add(quad),
      (prefix, prefixNode) => (prefixes[prefix] = prefixNode.value),
    );
    store.prefixes = prefixes;
    store.extractGraphUris();
    await store.extractMetadata();
    setStore(store, prefixes); // TODO maybe just return it
  }

  fetchLabel(t: Term | string): string {
    let label;
    const uri = isNamedNode(t) ? t.id : (t as string);
    if (uri) {
      // First search the current store for a label
      label = this.matchOne(namedNode(uri), NS.RDFS("label"), null, null)
        ?.object.value;
      if (label) return label;
      label = this.matchOne(namedNode(uri), NS.FOAF("name"), null, null)?.object
        .value;
      if (label) return label;

      // Failing that, look in the local labelCache
      label = this.labelCache[uri];
      if (label) return label;

      // Failing that, look in the global list of common labels
      label = COMMON_LABELS[uri];
      if (label) return label;

      //TODO: just use the #x string suffix of uri?
      // e.g.
      // http://www.w3.org/2002/07/owl#Thing
      // http://www.w3.org/2002/07/owl#NamedIndividual
      // https://w3id.org/np/RAuoXvJWbbzZsFslswYaajgjeEl-040X6SCQFXHfVtjf0#Garfield

      // Failing that also, fetch the document and look for an appropriate label (streaming)
      fetchQuads(uri, (quad: Quad) => {
        const p = quad.predicate.value;
        const s = quad.subject.value;
        if (s === uri || s === uri + "#assertion") {
          if (p === NS.RDFS("label").value) {
            label = quad.object.value;
            this.labelCache[uri] = label;
          } else if (p === NS.FOAF("name").value) {
            label = quad.object.value;
            this.labelCache[uri] = label;
          }
        }
        // TODO: if we find a label, we should exit
      }).then();
    }

    return label ?? shrinkUri(uri, this.prefixes);
  }

  /**
   * Match and return any single quad, or null if nothing is matched.
   *
   * TODO: if multiple are found (in arbitrary order), only one is returned. Perhaps throw an error instead?
   */
  matchOne(
    subject?: Term | null,
    predicate?: Term | null,
    object?: Term | null,
    graph?: NamedNode | string | null,
  ): Statement | null {
    return this.match(
      subject,
      predicate,
      object,
      typeof graph === "string" ? namedNode(graph) : graph,
    )
      .toStream()
      .read();
  }

  /**
   * Match and return any single quad, or null if nothing is matched, based on a predicate and graph.
   *
   * TODO: if multiple are found (in arbitrary order), only one is returned. Perhaps throw an error instead?
   */
  matchOnePredicate(
    predicate?: Term | null,
    graph?: NamedNode | string | null,
  ): Statement | null {
    return this.match(
      null,
      predicate,
      null,
      typeof graph === "string" ? namedNode(graph) : graph,
    )
      .toStream()
      .read();
  }

  /**
   * Return array of all matching quads, based on a predicate and graph (in arbitrary order).
   *
   */
  matchPredicate(
    predicate?: Term | null,
    graph?: NamedNode | string | null,
  ): Statement[] {
    return this.match(
      null,
      predicate,
      null,
      typeof graph === "string" ? namedNode(graph) : graph,
    ).toArray();
  }

  /**
   * Process and store the four nanopublication URIs
   * If the store is a well-formed nanopublication, it MUST contain these four URIs in he head
   *
   */
  private extractGraphUris() {
    // Search for URIs, as per spec: https://nanopub.net/guidelines/working_draft/#well-formed-nanopublications
    // "exactly one quad of the form '[N] rdf:type np:Nanopublication [H]', which identifies [N] as the nanopublication URI, and [H] as the head URI"
    const headQuad = this.matchOne(
      null,
      RDF("type"),
      NP("Nanopublication"),
      null,
    );
    const head = headQuad?.graph.value;

    // "exactly one quad of the form '[N] np:hasPublicationInfo [I] [H]', which identifies [I] as the publication information URI"
    const assertion = this.matchOnePredicate(NP("hasAssertion"), head)?.object
      .value;
    // "exactly one quad of the form '[N] np:hasProvenance [P] [H]', which identifies [P] as the provenance URI"
    const provenance = this.matchOnePredicate(NP("hasProvenance"), head)?.object
      .value;
    // "exactly one quad of the form '[N] np:hasAssertion [A] [H]', which identifies [A] as the assertion URI"
    const pubinfo = this.matchOnePredicate(NP("hasPublicationInfo"), head)
      ?.object.value;

    this.graphUris = { head, assertion, provenance, pubinfo };
  }

  /**
   * Process and store some metadata about the nanopublication
   *
   */
  private async extractMetadata() {
    // Prefer pubinfo graph for created/creator/etc., else any
    const createdLit = this.matchOnePredicate(
      DCT("created"),
      this.graphUris.pubinfo,
    );
    const creators = this.matchPredicate(
      DCT("creator"),
      this.graphUris.pubinfo,
    ).map((q) => {
      return this.fetchLabel(namedNode(q.object.value));
    });
    // Also check prov:wasAttributedTo in provenance
    const provCreators = this.matchPredicate(
      PROV("wasAttributedTo"),
      this.graphUris.provenance,
    ).map((q) => q.object.value);

    const title =
      this.matchOnePredicate(DCT("title"), this.graphUris.pubinfo) ??
      this.matchOne(
        namedNode(this.prefixes["this"]),
        RDFS("label"),
        null,
        this.graphUris.pubinfo,
      );

    const unique = (arr: string[]) => Array.from(new Set(arr));

    const assertionSubjects = this.graphUris.assertion
      ? this.match(null, null, null, namedNode(this.graphUris.assertion))
          ?.toArray()
          .map((t) => t.subject.value)
      : [];

    this.metadata = {
      created: createdLit?.object ? createdLit.object.value : null,
      creators: unique([...(creators || []), ...provCreators]),
      title: title?.object?.value || null,
      assertionSubjects: unique(assertionSubjects),
      uri: this.prefixes["this"],
    };
  }
}
