/**
 * Minimal TriG inspection helpers — regex-based, no full RDF parse.
 *
 * Cloudflare Workers can run the `n3` parser but it adds ~50 KB to the bundle.
 * The Python import-nanopub-chain.py script does mostly regex-level work
 * (ORCID + DOI scanning, longest-literal excerpts, single triple match
 * for `wasCreatedFromTemplate`), so we mirror that here.
 *
 * If we ever need full TriG semantics (e.g. resolving blank nodes, walking
 * named-graph membership), switch to `n3` then.
 */

export const ORCID_RE = /https?:\/\/orcid\.org\/0000-[0-9X-]+/gi;
export const DOI_RE = /https?:\/\/doi\.org\/10\.[0-9]+\/[^\s"<>]+/gi;

const CREATED_FROM_TEMPLATE_RE =
  /(?:nt:wasCreatedFromTemplate|<https:\/\/w3id\.org\/np\/o\/ntemplate\/wasCreatedFromTemplate>)\s+<([^>]+)>/;

const LABEL_RE =
  /(?:rdfs:label|<http:\/\/www\.w3\.org\/2000\/01\/rdf-schema#label>|dct:title|<http:\/\/purl\.org\/dc\/terms\/title>)\s+"((?:[^"\\]|\\.)*)"/g;

// Match string literals with at least 12 chars of content. Excludes newlines
// in the content class so the regex can't span two adjacent literals (closing
// quote of one paired with opening quote of the next captures TriG syntax
// between them as if it were content).
const LITERAL_RE = /"((?:[^"\\\n]|\\.){12,})"/g;

/**
 * Return the template URI used by this nanopub, if `wasCreatedFromTemplate`
 * appears in the TriG. The pubinfo graph is where it typically lives; this
 * matches the predicate wherever it sits.
 */
export function extractTemplateUri(trig: string): string | null {
  const m = CREATED_FROM_TEMPLATE_RE.exec(trig);
  return m ? m[1] : null;
}

/**
 * Return a label for a template TriG.
 *
 * Nanopub-network templates carry many rdfs:label triples — for the template
 * itself, for vocabulary terms it references, and for every form field. The
 * canonical template label lives in the property list of the AssertionTemplate
 * declaration:
 *
 *   sub:assertion a nt:AssertionTemplate;
 *     dct:description "…";
 *     rdfs:label "Declaring a replication study outcome according to FORRT";
 *     …
 *
 * We extract that label directly. Fallbacks:
 *   1. The pubinfo's `this: … rdfs:label "Template: …"` self-label
 *      (some templates use this older convention; strip the "Template: "
 *      prefix).
 *   2. Any longer-than-trivial label, to avoid empty step types.
 *
 * The Python import-nanopub-chain.py uses rdflib to filter by triple subject;
 * we approximate with regex to avoid bundling an RDF parser in the Worker.
 */
export function extractTemplateLabel(trig: string): string {
  // Primary: label inside the `a nt:AssertionTemplate; … rdfs:label "…"` block.
  // The content class uses alternation to skip over complete quoted strings
  // so periods inside string literals (e.g. `dct:description "...types."`)
  // don't terminate the capture prematurely.
  const tmplBlockMatch =
    /a\s+(?:nt:|<https:\/\/w3id\.org\/np\/o\/ntemplate\/>?)AssertionTemplate\s*;((?:"(?:[^"\\]|\\.)*"|[^.])*)\./.exec(
      trig,
    );
  if (tmplBlockMatch) {
    const blockLabel = /rdfs:label\s+"((?:[^"\\]|\\.)+)"/.exec(
      tmplBlockMatch[1],
    );
    if (blockLabel) {
      const cand = unescapeLiteral(blockLabel[1]).trim();
      if (cand) return cand;
    }
  }

  // Collect every label for the prefix-based fallbacks.
  const labels: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = LABEL_RE.exec(trig)) !== null) {
    labels.push(unescapeLiteral(m[1]));
  }
  LABEL_RE.lastIndex = 0;

  // Fallback 1: "Template: …" pubinfo self-label.
  for (const raw of labels) {
    const cand = raw.trim();
    if (cand.startsWith("Template: ")) return cand.slice("Template: ".length);
    if (cand.startsWith("Template ")) return cand.slice("Template ".length);
  }
  // Fallback 2: first non-trivial label.
  for (const raw of labels) {
    const cand = raw.trim();
    if (cand.length >= 8) return cand;
  }
  return "";
}

/**
 * Unique ORCID URIs appearing anywhere in the TriG.
 */
export function extractOrcids(trig: string): string[] {
  const out = new Set<string>();
  for (const m of trig.matchAll(ORCID_RE)) out.add(m[0]);
  return [...out];
}

/**
 * Unique DOI URIs appearing anywhere in the TriG.
 */
export function extractDois(trig: string): string[] {
  const out = new Set<string>();
  for (const m of trig.matchAll(DOI_RE)) out.add(m[0]);
  return [...out];
}

// Detect base64-encoded blobs (RSA signatures + public keys). These dominate
// the longest-literals view if not filtered. A blob is long, has no spaces,
// and only contains base64-safe chars.
const BASE64_BLOB_RE = /^[A-Za-z0-9+/=]{100,}$/;

// Detect ISO-8601 datetimes (XSD dateTime literals on dct:created, etc.).
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const TRIPLE_QUOTED_RE = /"""([\s\S]*?)"""/g;

/**
 * The longest few plain-text literals in the TriG — these are the substantive
 * content fields (Outcome conclusions, Study scopes, AIDA sentences) per the
 * Python script's `parse_node()`.
 *
 * Filters: URIs, base64 blobs (RSA signature + public key dominate raw
 * literals otherwise), ISO timestamps. Also picks up triple-quoted literals
 * (FORRT uses `"""…"""` for long textarea fields).
 */
export function extractExcerpts(trig: string, top = 4): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const tryAdd = (raw: string): void => {
    const val = raw.trim();
    if (val.length < 12) return;
    if (seen.has(val)) return;
    if (val.startsWith("http://") || val.startsWith("https://")) return;
    if (BASE64_BLOB_RE.test(val)) return;
    if (ISO_DATETIME_RE.test(val)) return;
    seen.add(val);
    out.push(val);
  };

  for (const m of trig.matchAll(LITERAL_RE)) tryAdd(unescapeLiteral(m[1]));
  for (const m of trig.matchAll(TRIPLE_QUOTED_RE))
    tryAdd(unescapeLiteral(m[1]));

  out.sort((a, b) => b.length - a.length);
  return out.slice(0, top);
}

function unescapeLiteral(s: string): string {
  return s
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
}

/**
 * Canonical nanopub URI matcher. Returns the bare `…/np/RA…` form (or its
 * `…/sciencelive/np/RA…` variant) without fragments or named-graph suffixes.
 */
const NANOPUB_URI_RE =
  /^(https?:\/\/w3id\.org\/(?:sciencelive\/)?np\/RA[A-Za-z0-9_-]{20,})/;

export function canonicalNanopubUri(any: string): string | null {
  const m = NANOPUB_URI_RE.exec(any);
  return m ? m[1] : null;
}

/**
 * Heuristic — does this template's label look like a template-DEFINITION
 * nanopub rather than a chain-step template? Mirrors the Python script's
 * "defining a/an … / publishing labels" filter.
 */
export function isTemplateDefinitionLabel(label: string): boolean {
  const l = label.toLowerCase();
  return (
    l.startsWith("defining a") ||
    l.startsWith("defining an") ||
    l.includes("publishing labels")
  );
}

const NANOPUB_URI_GLOBAL_RE =
  /https?:\/\/w3id\.org\/(?:sciencelive\/)?np\/RA[A-Za-z0-9_-]{20,}/g;

const GITHUB_RE = /https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/gi;
const ZENODO_DOI_RE = /https?:\/\/doi\.org\/10\.5281\/zenodo\.\d+/gi;

const FORRT_TERMS = "https://w3id.org/sciencelive/o/terms/";
const CITO_PREFIX = "http://purl.org/spar/cito/";
const SCHEMA_PREFIX = "http://schema.org/";
const PROV_PREFIX = "http://www.w3.org/ns/prov#";
const DCT_PREFIX = "http://purl.org/dc/terms/";

/** All CiTO relation names that can appear on a CiTO Citation nanopub. */
export const CITO_RELATIONS = [
  "cites",
  "confirms",
  "extends",
  "qualifies",
  "disputes",
  "obtainsBackgroundFrom",
  "obtainsSupportFrom",
  "supports",
  "credits",
  "discusses",
  "documents",
] as const;

export type CitoRelation = (typeof CITO_RELATIONS)[number];

/** All Outcome validation statuses defined by the FORRT vocabulary. */
export const OUTCOME_VALIDATION_STATUSES = [
  "Validated",
  "PartiallySupported",
  "Contradicted",
  "Inconclusive",
  "NotTested",
] as const;

export type OutcomeValidationStatus =
  (typeof OUTCOME_VALIDATION_STATUSES)[number];

/** All Outcome confidence levels defined by the FORRT vocabulary. */
export const OUTCOME_CONFIDENCE_LEVELS = [
  "VeryHighConfidence",
  "HighConfidence",
  "Moderate",
  "LowConfidence",
  "VeryLowConfidence",
] as const;

export type OutcomeConfidenceLevel =
  (typeof OUTCOME_CONFIDENCE_LEVELS)[number];

/**
 * Find every canonical nanopub URI mentioned in a TriG body. KP's
 * `npa:refersToNanopub` index does not materialise every chain edge
 * (Outcome→Claim, Study→AIDA links are missing from the index), so the
 * BFS walks the TriG body too and merges the URIs found there with the
 * SPARQL-discovered neighbours.
 *
 * Returns canonical URIs (stripped of fragments / named-graph suffixes)
 * with duplicates removed.
 */
export function extractNanopubUris(trig: string): string[] {
  const out = new Set<string>();
  for (const m of trig.matchAll(NANOPUB_URI_GLOBAL_RE)) {
    const canon = canonicalNanopubUri(m[0]);
    if (canon) out.add(canon);
  }
  return [...out];
}

/**
 * Find every GitHub repository URL in the TriG. Strips `/tree/...` and
 * `/blob/...` suffixes so only the repo root is returned. Mirrors the
 * Python import-nanopub-chain.py `_GITHUB_RE` extraction.
 */
export function extractGithubUrls(trig: string): string[] {
  const out = new Set<string>();
  for (const m of trig.matchAll(GITHUB_RE)) {
    const url = m[0].split("/tree/")[0].split("/blob/")[0].replace(/\/$/, "");
    out.add(url);
  }
  return [...out];
}

/**
 * Pull every object (URI or literal) from a Turtle property-list segment.
 * Segments come from `extractPredicateValues` after splitting at predicate
 * boundaries; this is the inner extraction over the comma-separated object
 * list. Handles `<URI>`, `"single-quoted"`, and `"""triple-quoted"""`.
 */
function extractObjectsFromSegment(segment: string): string[] {
  const objRe = /<([^>]+)>|"""([\s\S]*?)"""|"((?:[^"\\]|\\.)*)"/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = objRe.exec(segment)) !== null) {
    if (m[1] !== undefined) out.push(m[1]);
    else if (m[2] !== undefined) out.push(unescapeLiteral(m[2]));
    else if (m[3] !== undefined) out.push(unescapeLiteral(m[3]));
  }
  return out;
}

/**
 * Walk forward from `start` in `trig` until the end of the current Turtle
 * statement (an un-quoted `;` or `.`), respecting `"…"` and `"""…"""`
 * literals. Returns the text segment between `start` and the terminator
 * (exclusive). This is the engine behind `extractPredicateValue(s)` —
 * needed because the segment may carry a comma-separated object list like
 * `cito:isSupportedBy <a>, <b>, <c>;`.
 */
function readObjectSegment(trig: string, start: number): string {
  let i = start;
  let segment = "";
  while (i < trig.length) {
    // Triple-quoted literal — copy verbatim through the closing `"""`.
    if (trig.startsWith('"""', i)) {
      const end = trig.indexOf('"""', i + 3);
      if (end === -1) {
        segment += trig.slice(i);
        return segment;
      }
      segment += trig.slice(i, end + 3);
      i = end + 3;
      continue;
    }
    // Single-quoted literal — copy verbatim through the closing `"`.
    if (trig[i] === '"') {
      segment += '"';
      i++;
      while (i < trig.length && trig[i] !== '"') {
        if (trig[i] === "\\" && i + 1 < trig.length) {
          segment += trig[i] + trig[i + 1];
          i += 2;
          continue;
        }
        segment += trig[i];
        i++;
      }
      if (i < trig.length) {
        segment += '"';
        i++;
      }
      continue;
    }
    // Bracketed URI like `<http://example.org/foo>` — copy verbatim through
    // the closing `>`. Dots inside the URI must NOT terminate the segment.
    if (trig[i] === "<") {
      const end = trig.indexOf(">", i + 1);
      if (end === -1) {
        segment += trig.slice(i);
        return segment;
      }
      segment += trig.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    if (trig[i] === ";" || trig[i] === ".") return segment;
    segment += trig[i];
    i++;
  }
  return segment;
}

/**
 * Look up the OBJECT (literal or URI) of a triple in the TriG that uses the
 * given predicate URI. Returns the first match. Handles `<URI>`,
 * `"single-quoted"`, and `"""triple-quoted"""` objects. Returns null when
 * the predicate is absent.
 */
export function extractPredicateValue(
  trig: string,
  predicateUri: string,
): string | null {
  const values = extractPredicateValues(trig, predicateUri);
  return values.length > 0 ? values[0] : null;
}

/**
 * Same as `extractPredicateValue` but returns every match — handles both
 * the predicate repeating in the TriG AND the predicate carrying a
 * comma-separated object list like `cito:isSupportedBy <a>, <b>`.
 *
 * `predicate` accepts either:
 *   - Full URI form `"http://example.org/p"` — matches `<http://example.org/p>`
 *   - Prefixed form `"rdfs:label"` — matches `rdfs:label` literally (handy
 *     for pubinfo blocks where the resolver emits prefixed predicates).
 */
export function extractPredicateValues(
  trig: string,
  predicate: string,
): string[] {
  const escaped = predicate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const predRe = /^https?:\/\//.test(predicate)
    ? new RegExp(`<${escaped}>\\s+`, "g")
    : new RegExp(`(?:^|[\\s;{])${escaped}\\s+`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = predRe.exec(trig)) !== null) {
    const start = m.index + m[0].length;
    const segment = readObjectSegment(trig, start);
    for (const obj of extractObjectsFromSegment(segment)) out.push(obj);
    // Advance past the segment to avoid re-matching the same predicate.
    predRe.lastIndex = start + segment.length;
  }
  return out;
}

/**
 * Try a full URI form first, then a prefixed-form fallback. Returns the
 * first non-empty match. Useful when a predicate appears in either
 * representation depending on which TriG section it lives in.
 */
export function extractPredicateValueAny(
  trig: string,
  fullUri: string,
  prefixedForm: string,
): string | null {
  const a = extractPredicateValues(trig, fullUri);
  if (a.length > 0) return a[0];
  const b = extractPredicateValues(trig, prefixedForm);
  return b.length > 0 ? b[0] : null;
}

export function extractPredicateValuesAny(
  trig: string,
  fullUri: string,
  prefixedForm: string,
): string[] {
  const a = extractPredicateValues(trig, fullUri);
  if (a.length > 0) return a;
  return extractPredicateValues(trig, prefixedForm);
}

/**
 * Pubinfo-level metadata for a nanopub: rdfs:label of `this:`, dct:created,
 * dct:creator (multiple ORCIDs possible).
 *
 * The pubinfo graph has `this: rdfs:label "…"; dct:created "…"; dct:creator
 * <orcid>` (turtle property list) so we match on `this:` AS subject.
 */
export type NanopubMeta = {
  label: string;
  date: string;
  creators: string[];
};

export function extractNanopubMeta(trig: string): NanopubMeta {
  // Pubinfo (and sometimes assertion) writes these predicates in prefixed
  // form (`rdfs:label`, `dct:created`, `dct:creator`) when the W3ID resolver
  // emits the TriG. We accept either prefixed OR full-URI form and take
  // the first match for label/date (single-valued) and every match for
  // creator (ORCID list).
  const label =
    extractPredicateValueAny(
      trig,
      "http://www.w3.org/2000/01/rdf-schema#label",
      "rdfs:label",
    ) ?? "";
  const date =
    extractPredicateValueAny(
      trig,
      "http://purl.org/dc/terms/created",
      "dct:created",
    ) ?? "";
  const creatorObjects = extractPredicateValuesAny(
    trig,
    "http://purl.org/dc/terms/creator",
    "dct:creator",
  );
  const creators = new Set<string>();
  for (const obj of creatorObjects) {
    if (ORCID_RE.test(obj)) creators.add(obj);
    ORCID_RE.lastIndex = 0;
  }
  return {
    label: label.trim(),
    date: date.trim(),
    creators: [...creators],
  };
}

// =============================================================================
// Per-template structured extractors
// =============================================================================

export type OutcomeFields = {
  conclusion: string;
  evidence: string;
  limitations: string;
  validationStatus: OutcomeValidationStatus | "";
  confidenceLevel: OutcomeConfidenceLevel | "";
  repository: string;
  studyUri: string;
  endDate: string;
};

export function extractOutcomeFields(trig: string): OutcomeFields {
  const validationFull = extractPredicateValue(
    trig,
    `${FORRT_TERMS}hasValidationStatus`,
  );
  const confidenceFull = extractPredicateValue(
    trig,
    `${FORRT_TERMS}hasConfidenceLevel`,
  );
  return {
    conclusion:
      extractPredicateValue(trig, `${FORRT_TERMS}hasConclusionDescription`) ??
      "",
    evidence:
      extractPredicateValue(trig, `${FORRT_TERMS}hasEvidenceDescription`) ?? "",
    limitations:
      extractPredicateValue(trig, `${FORRT_TERMS}hasLimitationsDescription`) ??
      "",
    validationStatus: stripVocabPrefix(
      validationFull,
      OUTCOME_VALIDATION_STATUSES,
    ),
    confidenceLevel: stripVocabPrefix(
      confidenceFull,
      OUTCOME_CONFIDENCE_LEVELS,
    ),
    repository:
      extractPredicateValue(trig, `${FORRT_TERMS}hasOutcomeRepository`) ??
      extractPredicateValue(trig, `${FORRT_TERMS}hasRepository`) ??
      extractPredicateValue(trig, `${SCHEMA_PREFIX}codeRepository`) ??
      "",
    studyUri:
      extractPredicateValue(trig, `${FORRT_TERMS}isOutcomeOf`) ?? "",
    endDate: extractPredicateValue(trig, `${SCHEMA_PREFIX}endDate`) ?? "",
  };
}

export type StudyFields = {
  scope: string;
  methodology: string;
  deviations: string;
  discipline: string;
  claimUri: string;
};

export function extractStudyFields(trig: string): StudyFields {
  return {
    scope:
      extractPredicateValue(trig, `${FORRT_TERMS}hasScopeDescription`) ?? "",
    methodology:
      extractPredicateValue(trig, `${FORRT_TERMS}hasMethodologyDescription`) ??
      "",
    deviations:
      extractPredicateValue(trig, `${FORRT_TERMS}hasDeviationDescription`) ??
      "",
    discipline:
      extractPredicateValue(trig, `${FORRT_TERMS}hasDiscipline`) ?? "",
    claimUri:
      extractPredicateValue(trig, `${FORRT_TERMS}targetsClaim`) ?? "",
  };
}

export type ClaimFields = {
  claimType: string;
  aidaStatement: string;
};

/**
 * The Claim's type comes from a subclass URI like
 * `…/terms/model_performance-FORRT-Claim`. We parse the type prefix off the
 * URI suffix. The AIDA URI it cites lives in `asAidaStatement`.
 */
export function extractClaimFields(trig: string): ClaimFields {
  let claimType = "";
  const typeRe = new RegExp(
    `<${FORRT_TERMS.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([A-Za-z0-9_]+)-FORRT-Claim>`,
  );
  const tm = typeRe.exec(trig);
  if (tm) claimType = tm[1];
  return {
    claimType,
    aidaStatement:
      extractPredicateValue(trig, `${FORRT_TERMS}asAidaStatement`) ?? "",
  };
}

export type QuoteFields = {
  quotedText: string;
  citedDoi: string;
  comment: string;
};

export function extractQuoteFields(trig: string): QuoteFields {
  const dois = extractDois(trig);
  return {
    quotedText:
      extractPredicateValue(trig, `${CITO_PREFIX}hasQuotedText`) ?? "",
    citedDoi: dois[0] ?? "",
    comment:
      extractPredicateValue(
        trig,
        "http://www.w3.org/2000/01/rdf-schema#comment",
      ) ?? "",
  };
}

export type AidaFields = {
  sentence: string;
};

/**
 * AIDA nanopubs encode the sentence as the URI of an AIDA-Sentence subject:
 * `<http://purl.org/aida/Projected%20per-species%20rankings…>`. We decode
 * that URI suffix back into the plain sentence.
 */
export function extractAidaFields(trig: string): AidaFields {
  const aidaRe = /<http:\/\/purl\.org\/aida\/([^>]+)>/;
  const m = aidaRe.exec(trig);
  if (!m) return { sentence: "" };
  try {
    return { sentence: decodeURIComponent(m[1]).trim() };
  } catch {
    return { sentence: m[1] };
  }
}

export type CitoFields = {
  relations: CitoRelation[];
  citedTargets: string[];
  /**
   * The URI that appears as the SUBJECT of the CiTO triples — i.e. the
   * "citing entity". For Science Live FORRT CiTO Citation nanopubs this is
   * the Outcome URI that the CiTO is attached to. Empty when not found.
   */
  citingEntity: string;
};

export function extractCitoFields(
  trig: string,
  options: { selfUri?: string; templateUri?: string } = {},
): CitoFields {
  const relations: CitoRelation[] = [];
  const citedTargets = new Set<string>();
  for (const rel of CITO_RELATIONS) {
    const values = extractPredicateValues(trig, `${CITO_PREFIX}${rel}`);
    if (values.length > 0) {
      relations.push(rel);
      for (const v of values) citedTargets.add(v);
    }
  }

  // Find the SUBJECT (citing entity) of the CiTO triples. Two strategies:
  //   1) Direct regex `<URI>\s+<cito:p>` — works for compact property lists.
  //   2) "Only non-self non-template nanopub URI in the TriG" — works for the
  //      common FORRT outcome-level CiTO shape `<Outcome> a <CW>; <cito:p>`
  //      where the rdf:type triple sits between subject and CiTO predicate.
  let citingEntity = "";
  for (const rel of CITO_RELATIONS) {
    const escaped = `${CITO_PREFIX}${rel}`.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const re = new RegExp(`<([^>]+)>\\s+<${escaped}>`);
    const m = re.exec(trig);
    if (m) {
      citingEntity = canonicalNanopubUri(m[1]) ?? m[1];
      break;
    }
  }
  if (!citingEntity && relations.length > 0) {
    const self = options.selfUri
      ? canonicalNanopubUri(options.selfUri) ?? options.selfUri
      : "";
    const tmpl = options.templateUri ?? "";
    for (const u of extractNanopubUris(trig)) {
      if (u === self) continue;
      if (u === tmpl) continue;
      citingEntity = u;
      break;
    }
  }

  return { relations, citedTargets: [...citedTargets], citingEntity };
}

export type ResearchSoftwareFields = {
  repository: string;
  zenodoDoi: string;
  supportsTargets: string[];
};

export function extractResearchSoftwareFields(
  trig: string,
): ResearchSoftwareFields {
  const githubs = extractGithubUrls(trig);
  let zenodo = "";
  for (const m of trig.matchAll(ZENODO_DOI_RE)) {
    zenodo = m[0];
    break;
  }
  return {
    repository: githubs[0] ?? "",
    zenodoDoi: zenodo,
    supportsTargets: extractPredicateValues(trig, `${CITO_PREFIX}supports`),
  };
}

/**
 * Strip a FORRT vocab namespace prefix from a full URI and validate it
 * against a known set. Returns "" if the URI doesn't match any known value.
 */
function stripVocabPrefix<T extends string>(
  fullUri: string | null,
  known: readonly T[],
): T | "" {
  if (!fullUri) return "";
  const short = fullUri.split("/").pop() ?? "";
  return (known as readonly string[]).includes(short) ? (short as T) : "";
}

export type ResearchSynthesisFields = {
  synthesisDescription: string;
  conditions: string;
  limitations: string;
  recommendations: string;
  supportedByOutcomeUris: string[];
  topicQids: string[];
  endDate: string;
};

/**
 * Research Synthesis is the apex of a multi-chain FORRT constellation. Its
 * `cito:isSupportedBy` predicate enumerates the Outcome nanopubs that the
 * synthesis aggregates — this is the canonical Synthesis → Outcome linkage.
 */
export function extractResearchSynthesisFields(
  trig: string,
): ResearchSynthesisFields {
  const supportedBy = extractPredicateValues(
    trig,
    `${CITO_PREFIX}isSupportedBy`,
  );
  const subjectUris = extractPredicateValues(trig, `${DCT_PREFIX}subject`);
  const wikidataQs = subjectUris
    .filter((u) => u.startsWith("http://www.wikidata.org/entity/Q"))
    .map((u) => u.split("/").pop() ?? "");
  return {
    synthesisDescription:
      extractPredicateValue(trig, `${FORRT_TERMS}hasSynthesisDescription`) ??
      "",
    conditions:
      extractPredicateValue(trig, `${FORRT_TERMS}hasConditionsDescription`) ??
      "",
    limitations:
      extractPredicateValue(trig, `${FORRT_TERMS}hasLimitationsDescription`) ??
      "",
    recommendations:
      extractPredicateValue(
        trig,
        `${FORRT_TERMS}hasRecommendationDescription`,
      ) ?? "",
    supportedByOutcomeUris: supportedBy
      .map((u) => canonicalNanopubUri(u))
      .filter((u): u is string => u !== null),
    topicQids: wikidataQs,
    endDate: extractPredicateValue(trig, `${SCHEMA_PREFIX}endDate`) ?? "",
  };
}

/** Suppress PROV_PREFIX import warning while keeping the constant available. */
void PROV_PREFIX;
