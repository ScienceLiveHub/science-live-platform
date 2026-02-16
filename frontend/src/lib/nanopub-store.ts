import { DataFactory, Store as N3Store, NamedNode, Term, Util } from "n3";
import {
  extractSubjectProps,
  fetchQuads,
  NS,
  parseRdf,
  shrinkUri,
  Statement,
} from "./rdf";
import {
  getNanopubSuffix,
  getUriEnd,
  isDoiUri,
  isNanopubUri,
  toScienceLiveNPUri,
  unique,
} from "./uri";

const { namedNode } = DataFactory;
const { isNamedNode } = Util;
const { RDF, RDFS, NP, NPX, DCT } = NS;

type GraphUris = {
  head?: string;
  assertion?: string;
  provenance?: string;
  pubinfo?: string;
};

type CitationFormats = "apa" | "mla" | "chicago" | "bibtex" | string;

/**
 * Generate citation in different formats
 */
export function generateCitation(
  data?: Metadata,
  format: CitationFormats = "apa",
) {
  const author = data?.creators?.[0]?.name || "Unknown Author";
  const year = data?.created ? new Date(data.created).getFullYear() : "n.d.";
  const title = data?.title || "Untitled Nanopublication";
  const uri = data?.uri;

  if (!uri) return "";

  // Extract just the nanopub ID for cleaner display
  const npId = uri.split("/").pop();

  const formats = {
    apa: `${author}. (${year}). ${title} [Nanopublication]. ${uri}`,
    mla: `${author}. "${title}." Nanopublication, ${year}, ${uri}.`,
    chicago: `${author}. "${title}." Nanopublication. ${year}. ${uri}.`,
    bibtex: `@misc{nanopub_${npId},\n  author = {${author}},\n  title = {${title}},\n  year = {${year}},\n  howpublished = {Nanopublication},\n  url = {${uri}}\n}`,
  };

  return formats[format as keyof typeof formats] || formats.apa;
}

export type IntroducedObject = {
  uri?: string;
  label?: string;
  types?: { name: string; href?: string }[];
};

export type Metadata = {
  created?: string | null;
  creators?: { name?: string; href?: string }[];
  types?: { name: string; href?: string }[];
  introduces?: IntroducedObject[];
  title?: string | null;
  assertionSubjects?: any[];
  license?: string;
  uri?: string;
  template?: string;
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
  "http://www.w3.org/2000/01/rdf-schema#label": "is labelled",
  "http://purl.org/nanopub/x/hasNanopubType": "is a nanopub of type",
  "http://purl.org/nanopub/x/wasCreatedAt": "is a nanopub created at",
  "http://www.w3.org/2000/01/rdf-schema#comment": "has the quote or comment",
  "http://purl.org/spar/cito/includesQuotationFrom": "includes quotation from",
  "http://www.w3.org/ns/prov#wasAttributedTo": "was attributed to",
  "https://w3id.org/np/o/ntemplate/hasLabelFromApi": "has label from API",
};

export const COMMON_LICENSES: Record<string, string> = {
  "https://creativecommons.org/licenses/by/4.0/":
    "Attribution 4.0 International (CC BY 4.0)",
  "https://creativecommons.org/licenses/by-sa/4.0/":
    "Attribution-ShareAlike 4.0 International (CC BY 4.0)",
  "https://creativecommons.org/publicdomain/zero/1.0/":
    "CC0 1.0 Universal (CC0 1.0) Public Domain Dedication",
};

/**
 * This class adds some dev-friendly convenience on top of the specs-compatible N3.Store.
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
   * Load a Nanopublication from a string in RDF format
   *
   * (Technically this will load any RDF, not just nanopubs)
   *
   */
  static async loadString(rdf: string) {
    const store = new NanopubStore();
    const prefixes: any = {};
    await parseRdf(
      rdf,
      (quad) => store.add(quad),
      (prefix, prefixNode) => (prefixes[prefix] = prefixNode.value),
    );
    store.prefixes = prefixes;
    store.extractGraphUris();
    await store.extractMetadata();

    return store;
  }

  /**
   * Find a user-friendly label for term, using heuristics and searching within the nanopub.
   * We want to make a best-attempt while avoiding any async calls here.
   *
   * Return undefined if either nothing found or it is deemed better for the caller to
   * handle it (e.g. do an async lookup using a hook, or just show the uri as label)
   */
  findInternalLabel(t: Term | string): string | undefined {
    let label;
    const uri = isNamedNode(t as Term) ? (t as NamedNode).id : (t as string);
    if (uri) {
      // Search the document internally, then the local labelCache, then a list of COMMON_LABELS
      label =
        this.matchOne(namedNode(uri), NS.FOAF("name"), null, null)?.object
          .value ||
        this.matchOne(namedNode(uri), NS.NPTs("hasLabelFromApi"), null, null)
          ?.object.value ||
        this.labelCache[uri] ||
        COMMON_LABELS[uri];
      if (label) {
        return label;
      }

      if (isNanopubUri(uri)) {
        // Look for a suffix if available
        label = getNanopubSuffix(uri);
        label = label === "assertion" ? "This assertion" : label;
        if (label) {
          return label;
        } else {
          return undefined;
        }
      }

      // Return undefined for anything that we want to look up async later
      if (isDoiUri(uri)) {
        return undefined;
      }
      if (uri.startsWith("https://orcid.org/")) {
        return undefined;
      }
      if (uri.startsWith("http://www.wikidata.org/entity/")) {
        return undefined;
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
        name: this.findInternalLabel(namedNode(q.object.value)) ?? undefined,
        href: q.object.value,
      };
    });
    // Also check prov:wasAttributedTo in provenance
    // const provCreators = this.matchPredicate(
    //   PROV("wasAttributedTo"),
    //   this.graphUris.provenance,
    // ).map((q) => q.object.value);

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
    this.match(
      namedNode(this.prefixes["this"]),
      RDF("type"),
      null,
      namedNode(this.graphUris.pubinfo!),
    ).forEach((q) => {
      types.push({
        name:
          this.findInternalLabel(namedNode(q.object.value)) ?? q.object.value,
        href: q.object.value,
      });
    });
    const introduces: IntroducedObject[] | undefined = this.match(
      namedNode(this.prefixes["this"]),
      NPX("introduces"),
      null,
      namedNode(this.graphUris.pubinfo!),
    )
      .toArray()
      .map((i) => {
        const props = extractSubjectProps(
          this,
          namedNode(i.object.value),
          {
            types_$array: [NS.RDF("type")],
            label: [NS.RDFS("label")],
          },
          null,
          false,
          true,
        );
        return { uri: i.object.value, types: props.types, label: props.label };
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

    const template = this.matchOne(
      null,
      NS.NPTs("wasCreatedFromTemplate"),
      null,
      this.graphUris.pubinfo,
    )?.object.value;

    this.metadata = {
      created: createdLit?.object ? createdLit.object.value : null,
      creators,
      types,
      introduces: introduces,
      title: title?.object?.value || null,
      assertionSubjects: unique(assertionSubjects),
      license,
      uri: this.prefixes["this"],
      template,
    };
  }

  /**
   * Get the citation as a string.
   */
  getCitation(format: CitationFormats = "apa") {
    return generateCitation(this.metadata, format);
  }

  /**
   * Output nanopublication as a markdown string.
   */
  toMarkdownString() {
    const title = this.metadata.title ?? "Untitled Nanopublication";
    const creators = this.metadata.creators?.length
      ? this.metadata.creators
          .map((creator) =>
            creator.href ? `[${creator.name}](${creator.href})` : creator.name,
          )
          .join(", ")
      : "Unknown";
    const published = this.metadata.created
      ? new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
          new Date(this.metadata.created),
        )
      : "Unknown";
    const type = this.metadata.types?.[0]?.name ?? "Unknown";
    const license = this.metadata.license
      ? (() => {
          const label =
            this.findInternalLabel(namedNode(this.metadata.license!)) ??
            getUriEnd(this.metadata.license!) ??
            this.metadata.license!;
          return `[${label}](${this.metadata.license})`;
        })()
      : "Unknown";
    const citation = this.getCitation();
    const sourceUri = this.metadata.uri;
    const exploreLink = sourceUri ? toScienceLiveNPUri(sourceUri) : undefined;

    const assertionGraph = this.graphUris.assertion
      ? namedNode(this.graphUris.assertion)
      : null;
    const assertionStatements = assertionGraph
      ? this.match(null, null, null, assertionGraph).toArray()
      : [];
    const assertionBulletPoints = assertionStatements.length
      ? assertionStatements.map((statement) => {
          const subject = this.formatTermMarkdown(statement.subject);
          const predicate = this.formatTermMarkdown(statement.predicate);
          const object = this.formatTermMarkdown(statement.object);
          return `- ${subject} ${predicate} ${object}`;
        })
      : ["- _No assertions found._"];

    const formattedLines = [
      `# Nanopub: ${title}`,
      "",
      ...assertionBulletPoints,
      "",
      `**Created by:** ${creators}`,
      "",
      `**Published:** ${published}`,
      "",
      `**Type:** \`${type}\``,
      "",
      `**License:** ${license}`,
      "",
      citation,
      "",
      `[Original Source](${sourceUri})`,
      "",
      `**[Explore on Science Live](${exploreLink})**`,
    ];

    return formattedLines.join("\n");
  }

  private formatTermMarkdown(
    term:
      | Term
      | Statement["subject"]
      | Statement["predicate"]
      | Statement["object"],
  ) {
    if (term.termType === "NamedNode") {
      const label = this.findInternalLabel(term as NamedNode) ?? term.value;
      // Replace nanopub links with ScienceLive Platform links
      return `[${label}](${isNanopubUri(term.value) ? toScienceLiveNPUri(term.value) : term.value})`;
    }

    if (term.termType === "Literal") {
      const lang = term.language ? `@${term.language}` : "";
      return `"${term.value}"${lang}`;
    }

    return term.value;
  }
}
