import {
  DataFactory,
  Store as N3Store,
  NamedNode,
  Term,
  Util,
  Writer,
} from "n3";
import { NANOPUB_LABELS, NANOPUB_REFERS_TO, NANOPUB_TYPES } from "./queries";
import {
  extractSubjectProps,
  fetchQuads,
  NS,
  parseRdf,
  shrinkUri,
  Statement,
} from "./rdf";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_FULL } from "./sparql";
import {
  getNanopubHash,
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
  const title = data
    ? data.title || getNanopubHash(data.uri!)?.substring(0, 10)
    : "Untitled";
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

/** Well-known URI labels (matched with and without trailing slash) */
const WELL_KNOWN_URI_LABELS: Record<string, string> = {
  "https://pubmed.ncbi.nlm.nih.gov": "PubMed",
  "https://www.scopus.com": "Scopus",
  "https://www.webofscience.com": "Web of Science",
  "https://arxiv.org": "arXiv",
  "https://scholar.google.com": "Google Scholar",
  "https://www.cochranelibrary.com": "Cochrane Library",
  "https://ieeexplore.ieee.org": "IEEE Xplore",
  "https://dl.acm.org": "ACM Digital Library",
  "https://www.embase.com": "Embase",
  "https://eric.ed.gov": "ERIC",
  "https://www.jstor.org": "JSTOR",
};

/** Look up a well-known URI label, normalizing trailing slashes */
export function getWellKnownLabel(uri: string): string | undefined {
  return (
    WELL_KNOWN_URI_LABELS[uri] ?? WELL_KNOWN_URI_LABELS[uri.replace(/\/+$/, "")]
  );
}

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
  static async load(url: string, fillLabelCache = false) {
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
    if (fillLabelCache) {
      await store.fillLabelCacheFromRefersTo();
    }

    return store;
  }

  /**
   * Load a Nanopublication from a string in RDF format
   *
   * (Technically this will load any RDF, not just nanopubs)
   *
   */
  static async loadString(rdf: string, fillLabelCache = false) {
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
    if (fillLabelCache) {
      await store.fillLabelCacheFromReferencedNanopubs();
    }

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
        this.labelCache[uri] ||
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
      if (
        uri.startsWith("http://www.wikidata.org/entity/") ||
        uri.startsWith("https://www.wikidata.org/wiki/") ||
        uri.startsWith("https://www.wikidata.org/entity/")
      ) {
        return undefined;
      }
      if (uri.startsWith("http://purl.obolibrary.org/obo/")) {
        return undefined;
      }

      // Check well-known URIs (e.g. academic databases)
      const wellKnown = getWellKnownLabel(uri);
      if (wellKnown) {
        return wellKnown;
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

    // Find all applicable "types" "classes" and "tags" for this nanopub
    const types: Metadata["types"] = [];
    const nanopubUri = this.prefixes["this"];

    // Prefer the SPARQL query against the nanopub network index
    // for authoritative npx:hasNanopubType information
    // TODO: We could also us the query to get authoritative introduces, creator, date, title etc
    //       We always need a fallback to local in the case of non-published RDF loaded
    if (nanopubUri) {
      try {
        const sparqlTypes = await executeBindSparql(
          NANOPUB_TYPES,
          { nanopubUri },
          NANOPUB_SPARQL_ENDPOINT_FULL,
        );
        if (sparqlTypes?.length < 1) {
          throw new Error("Types not found");
        }
        for (const row of sparqlTypes) {
          types.push({
            name: this.findInternalLabel(namedNode(row.type)) ?? row.type,
            href: row.type,
          });
        }
      } catch {
        // Fall back to local store matching for unpublished or unindexed nanopubs
        this.match(
          namedNode(nanopubUri),
          NPX("hasNanopubType"),
          null,
          namedNode(this.graphUris.pubinfo!),
        ).forEach((q) => {
          types.push({
            name:
              this.findInternalLabel(namedNode(q.object.value)) ??
              q.object.value,
            href: q.object.value,
          });
        });
        // Also include rdf:type from the assertion graph (types of the assertion subject)
        this.match(
          namedNode(this.graphUris.assertion!),
          RDF("type"),
          null,
          namedNode(this.graphUris.assertion!),
        ).forEach((q) => {
          types.push({
            name:
              this.findInternalLabel(namedNode(q.object.value)) ??
              q.object.value,
            href: q.object.value,
          });
        });
        // And rdf:type from the pubinfo graph
        this.match(
          namedNode(this.prefixes["this"]),
          RDF("type"),
          null,
          namedNode(this.graphUris.pubinfo!),
        ).forEach((q) => {
          types.push({
            name:
              this.findInternalLabel(namedNode(q.object.value)) ??
              q.object.value,
            href: q.object.value,
          });
        });
      }
    }

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

    // This is a special workaround, as we used to fall back to using "NP created using..."
    // if the NP was created using a template with no hasNanopubLabelPattern specified, and
    // that was not ideal because all the NPs send up with the same name.
    // So if we detect legacy nanopubs, try best effort to get the label of the first
    // introduced subject, which is the newer strategy as of early May 2026.
    // Also related: bestLabelForRow() helper function.
    // Determine the title value, potentially overriding the default if it's a legacy placeholder
    const defaultTitleValue = title?.object?.value || null;
    const titleValue =
      defaultTitleValue?.startsWith("NP created using") &&
      introduces &&
      introduces.length > 0
        ? (introduces.find((intro) => intro.label)?.label ?? defaultTitleValue)
        : defaultTitleValue;

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
      title: titleValue,
      assertionSubjects: unique(assertionSubjects),
      license,
      uri: this.prefixes["this"],
      template,
    };
  }

  /**
   * Use the nanopub-refers-to SPARQL query to populate the labelCache
   * with labels of nanopubs referred to by this nanopub.
   * Suitable for published nanopubs loaded via URL.
   */
  protected async fillLabelCacheFromRefersTo() {
    const nanopubUri = this.metadata.uri ?? this.prefixes["this"];
    if (!nanopubUri) return;

    try {
      const results = await executeBindSparql(
        NANOPUB_REFERS_TO,
        { nanopubUri },
        NANOPUB_SPARQL_ENDPOINT_FULL,
      );
      if (results) {
        for (const row of results) {
          if (row.refNanopub && row.label) {
            this.labelCache[row.refNanopub] = row.label;
          }
        }
      }
    } catch {
      // Silently ignore – label cache is best-effort
    }
  }

  /**
   * Scan the store for nanopub URIs referenced in quads (excluding this
   * nanopub's own URI) and use a single SPARQL query with a VALUES clause
   * to fetch their labels into the labelCache.
   * Suitable for unpublished nanopubs loaded from a string, where the
   * nanopub-refers-to network index query would not work.
   */
  protected async fillLabelCacheFromReferencedNanopubs() {
    const ownUri = this.metadata.uri ?? this.prefixes["this"];
    const seenUris = new Set<string>();

    // Collect unique nanopub URIs referenced as objects in quads
    for (const quad of this.getQuads(null, null, null, null)) {
      if (quad.object.termType === "NamedNode") {
        const objUri = quad.object.value;
        if (
          objUri &&
          objUri !== ownUri &&
          isNanopubUri(objUri) &&
          !seenUris.has(objUri)
        ) {
          seenUris.add(objUri);
        }
      }
    }

    if (seenUris.size === 0) return;

    // Build a VALUES list of URI references and fetch all labels in a single query
    const valuesList = [...seenUris].map((uri) => `<${uri}>`).join(" ");

    try {
      const results = await executeBindSparql(
        NANOPUB_LABELS,
        { nanopubUris: valuesList },
        NANOPUB_SPARQL_ENDPOINT_FULL,
      );
      if (results) {
        for (const row of results) {
          if (row.nanopubUri && row.label) {
            this.labelCache[row.nanopubUri] = row.label;
          }
        }
      }
    } catch {
      // Silently ignore – label cache is best-effort
    }
  }

  /**
   * Get the citation as a string.
   */
  getCitation(format: CitationFormats = "apa") {
    return generateCitation(this.metadata, format);
  }

  /**
   * Serialize quads to an RDF string.
   * Sorted by graph/subject/predicate/object for consistency.
   */
  serialize() {
    // Serialize to TRIG format, with predicable sorting of quads
    const writer = new Writer();
    let trigOutput = "";
    const quads = this.getQuads(null, null, null, null).sort((a, b) => {
      const graphCompare = (a.graph?.value ?? "").localeCompare(
        b.graph?.value ?? "",
      );
      if (graphCompare !== 0) return graphCompare;
      const subjectCompare = (a.subject?.value ?? "").localeCompare(
        b.subject?.value ?? "",
      );
      if (subjectCompare !== 0) return subjectCompare;
      const predicateCompare = (a.predicate?.value ?? "").localeCompare(
        b.predicate?.value ?? "",
      );
      if (predicateCompare !== 0) return predicateCompare;
      return (a.object?.value ?? "").localeCompare(b.object?.value ?? "");
    });

    writer.addQuads(quads);
    writer.end((error, result: string) => {
      if (error) {
        throw new Error(`Failed to serialize TRIG: ${error}`);
      }
      trigOutput = result;
    });
    return trigOutput;
  }

  /**
   * Output nanopublication as a markdown string.
   */
  toMarkdownString() {
    const title =
      this.metadata.title ??
      getNanopubHash(this.metadata.uri!)?.substring(0, 10);
    const creators = this.metadata.creators?.length
      ? this.metadata.creators
          .map((creator) =>
            creator.href
              ? `[${creator.name}](${toScienceLiveNPUri(creator.href, false)})`
              : creator.name,
          )
          .join(", ")
      : "Unknown";
    const published = this.metadata.created
      ? new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
          new Date(this.metadata.created),
        )
      : "Unknown";
    const types =
      this.metadata.types && this.metadata.types.length > 0
        ? this.metadata.types
        : [{ name: "Unknown", href: "" }];
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
    const exploreLink = sourceUri
      ? toScienceLiveNPUri(sourceUri, false)
      : undefined;

    const assertionGraph = this.graphUris.assertion
      ? namedNode(this.graphUris.assertion)
      : null;
    const assertionStatements = assertionGraph
      ? this.match(null, null, null, assertionGraph).toArray()
      : [];
    const assertionBulletPoints = assertionStatements.length
      ? assertionStatements.map((statement, idx) => {
          const repeat = statement.subject.equals(
            assertionStatements[idx - 1]?.subject,
          );
          const firstOfRepeat =
            !repeat &&
            statement.subject.equals(assertionStatements[idx + 1]?.subject);

          const subject = this.formatTermMarkdown(statement.subject);
          const predicate = this.formatTermMarkdown(statement.predicate);
          const object = this.formatTermMarkdown(statement.object);
          if (firstOfRepeat) {
            return `- **${subject}**\n    - ${predicate} ${object}`;
          }
          if (repeat) {
            return `    - ${predicate} ${object}`;
          }

          return `- **${subject}** ${predicate} ${object}`;
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
      `**Types:** ${types.map((t) => `[${t.name}](${t.href})`).join(", ")}`,
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
      return `[${decodeURI(label)}](${toScienceLiveNPUri(term.value, false)})`;
    }

    if (term.termType === "Literal") {
      // TODO: should we deal with different languages and data types?
      // const lang = term.language ? `@${term.language}` : "";
      // const dataType = term.datatype?.value ? `^${term.datatype.value}` : "";
      // return `"${decodeURI(term.value)}"${lang + dataType}`;
      return `"${decodeURI(term.value)}"`;
    }

    return term.value;
  }
}
