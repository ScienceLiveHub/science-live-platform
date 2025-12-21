import { fetchQuads, NS, shrinkUri, Statement } from "@/lib/rdf";
import { DataFactory, Store as N3Store, NamedNode, Term, Util } from "n3";
import { getUriEnd, isDoiUri, isNanopubUri, unique } from "./utils";

const { namedNode } = DataFactory;
const { isNamedNode } = Util;
const { RDF, RDFS, XSD, NP, NPT, NPX, DCT, PROV, FOAF } = NS;

type GraphUris = {
  head?: string;
  assertion?: string;
  provenance?: string;
  pubinfo?: string;
};

export type Metadata = {
  created?: string | null;
  creators?: { name: string; href?: string }[];
  types?: { name: string; href?: string }[];
  title?: string | null;
  assertionSubjects?: any[];
  license?: string;
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
export class NanopubStore extends N3Store {
  // Store a map of URIs and their "friendly" labels, which could include both internal or external
  labelCache: Record<string, string> = {};

  graphUris: GraphUris = {};
  metadata: Metadata = {};
  prefixes: Record<string, string> = {};

  /**
   * Load a Nanopublication from a given URL
   *
   * (Technically this will load any RDF given a URL, not just nanopubs)
   *
   */
  static async load(url: string) {
    const store = new NanopubStore();
    const prefixes: any = {};
    await fetchQuads(
      url,
      (quad) => store.add(quad),
      (prefix, prefixNode) => (prefixes[prefix] = prefixNode.value),
    );
    store.prefixes = prefixes;
    store.extractGraphUris();
    await store.extractMetadata();

    return store;
  }

  /**
   * Find a user-friendly label for term, using heuristics and searching within the nanopub
   *
   */
  findInternalLabel(t: Term | string): string | undefined {
    let label;
    const uri = isNamedNode(t as Term) ? (t as NamedNode).id : (t as string);
    if (uri) {
      // Search the document internally, then the local cache, then a list of common labels
      // label = this.matchOne(namedNode(uri), NS.RDFS("label"), null, null)
      //   ?.object.value;
      label =
        this.matchOne(namedNode(uri), NS.FOAF("name"), null, null)?.object
          .value ??
        this.labelCache[uri] ??
        COMMON_LABELS[uri];
      if (label) return label;

      // Return null if it's a Nanopub or DOI
      // The caller can handle this (e.g. do an async call using a hook or just show the uri)
      if (isNanopubUri(uri) || isDoiUri(uri)) {
        return undefined;
      }

      // Failing that, a special case where the uri starts with the current nanopubs uri (this/sub)
      const thisNpUri = this.prefixes["this"] ?? this.prefixes["sub"];
      if (thisNpUri && uri.startsWith(thisNpUri)) {
        label = uri.replace(thisNpUri, "");
        const firstChar = label.charAt(0);
        if (firstChar === "/" || firstChar === "#") {
          label = label.substring(1);
        }
        label = label === "assertion" ? "This assertion" : label;
        if (label.length) {
          return label;
        } else {
          return "This nanopublication";
        }
      }

      // Failing that, use the end-most part of the URL converted to space case
      label = getUriEnd(uri);
      if (label) {
        return label; //label.split(/(?=[A-Z])/).reduce((p, c) => p + " " + c)!;
      }

      return shrinkUri(uri, this.prefixes);
    }

    return undefined;
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
  protected extractGraphUris() {
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
  protected async extractMetadata() {
    // Prefer pubinfo graph for created/creator/etc., else any
    const createdLit = this.matchOnePredicate(
      DCT("created"),
      this.graphUris.pubinfo,
    );
    const creators = this.matchPredicate(
      DCT("creator"),
      this.graphUris.pubinfo,
    ).map((q) => {
      return {
        // TODO: we could also set the name to undefined if not found, and the UI can try to fetch something better via the useLabels hook
        name:
          this.findInternalLabel(namedNode(q.object.value)) ?? q.object.value,
        href: q.object.value,
      };
    });
    // Also check prov:wasAttributedTo in provenance
    const provCreators = this.matchPredicate(
      PROV("wasAttributedTo"),
      this.graphUris.provenance,
    ).map((q) => q.object.value);

    // Find all applicable "types" "classes" and "tags" for this nanopub
    const types: any = [];
    this.match(
      namedNode(this.graphUris.assertion!),
      RDF("type"),
      null,
      namedNode(this.graphUris.assertion!),
    ).forEach((q) => {
      types.push({
        name:
          this.findInternalLabel(namedNode(q.object.value)) ?? q.object.value,
        href: q.object.value,
      });
    });
    this.match(
      namedNode(this.prefixes["this"]),
      NPX("hasNanopubType"),
      null,
      namedNode(this.graphUris.pubinfo!),
    ).forEach((q) => {
      types.push({
        name:
          this.findInternalLabel(namedNode(q.object.value)) ?? q.object.value,
        href: q.object.value,
      });
    });

    const title =
      this.matchOnePredicate(DCT("title"), this.graphUris.pubinfo) ??
      this.matchOne(
        namedNode(this.prefixes["this"]),
        RDFS("label"),
        null,
        this.graphUris.pubinfo,
      );

    const license = this.matchOne(
      namedNode(this.prefixes["this"]),
      DCT("license"),
      null,
      this.graphUris.pubinfo,
    )?.object.value;

    const assertionSubjects = this.graphUris.assertion
      ? this.match(null, null, null, namedNode(this.graphUris.assertion))
          ?.toArray()
          .map((t) => t.subject.value)
      : [];

    this.metadata = {
      created: createdLit?.object ? createdLit.object.value : null,
      creators: creators,
      types: types,
      title: title?.object?.value || null,
      assertionSubjects: unique(assertionSubjects),
      license: license,
      uri: this.prefixes["this"],
    };
  }
}
