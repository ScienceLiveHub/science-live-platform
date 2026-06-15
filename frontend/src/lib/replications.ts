/**
 * Replication summary — given a paper DOI, find every independent replication of its
 * claims on the nanopub network and the verdict each reached.
 *
 * This is the data behind the public "all replications of a paper" page. It is deliberately
 * client-side and unauthenticated: it reads only public nanopub-network data via SPARQL, so the
 * page works for anyone (the authenticated API stays for programmatic/registered use).
 *
 * Enumeration uses the CiTO→DOI method (a verdict-citation from a replication Outcome to the
 * original paper's DOI), NOT graph BFS — the latter bleeds across adjacent chains and misses
 * disconnected replications. Validity is then checked against retraction/supersession.
 */
import { executeSparql, NANOPUB_SPARQL_ENDPOINT_FULL } from "@/lib/sparql";

const TPL_CITO =
  "https://w3id.org/np/RA43F9EoOuzF0xoNUnCMNyFsfIqlsuWDdPHCnN0wCdCAw";

// CiTO relations that carry a verdict ON the paper (as opposed to method/data provenance).
const VERDICT_RELS = new Set([
  "confirms",
  "qualifies",
  "disputes",
  "critiques",
  "extends",
  "supports",
  "refutes",
]);

export type Replication = {
  outcomeNp: string;
  verdict: string; // Validated | PartiallySupported | Contradicted | NotSupported | …
  relation: string; // confirms | qualifies | disputes | …
  confidence: string; // HighConfidence | …
  conclusion: string;
  repo: string;
  study: {
    uri: string;
    label: string;
    scope: string;
    method: string;
    deviation: string;
  };
  claim: { uri: string; label: string; aida: string; type: string };
};

export type ReplicationSummary = {
  doi: string;
  count: number;
  byVerdict: { validated: number; partial: number; contradicted: number };
  replications: Replication[];
};

const npHash = (u: string) => (u || "").replace(/.*\/np\//, "").split("/")[0];

// AIDA statement IRI → the atomic claim sentence (mixed +/%20 encoding in the wild).
const decodeAida = (u: string): string => {
  if (!u) return "";
  try {
    return decodeURIComponent(u.replace(/.*\/aida\//, "").replace(/\+/g, " "));
  } catch {
    return "";
  }
};

// ".../terms/model_performance-FORRT-Claim" → "model performance"
const claimTypeLabel = (u: string): string =>
  u
    ? u
        .replace(/.*\/terms\//, "")
        .replace(/-FORRT-Claim$/, "")
        .replace(/_/g, " ")
    : "";

export const isContradicted = (v: string) =>
  /contradict|notsupport|refut/i.test(v);
export const isPartial = (v: string) => /partial/i.test(v);
export const isConfirmed = (v: string) =>
  /validat|confirm|support/i.test(v) && !isContradicted(v) && !isPartial(v);

const DOI_RE = /^10\.\d{3,}\/\S+$/;

// One query, anchored on the paper DOI: every Outcome that makes a verdict-citation to the DOI,
// walked up its chain (Outcome → Study → Claim) for the display fields. Fast (~0.3s) because the
// DOI anchors it; the validity guard is a separate scoped query (an inline FILTER NOT EXISTS here
// times the endpoint out).
function chainQuery(doiUri: string): string {
  return `PREFIX np: <http://www.nanopub.org/nschema#>
PREFIX ntpl: <https://w3id.org/np/o/ntemplate/>
PREFIX cito: <http://purl.org/spar/cito/>
PREFIX slt: <https://w3id.org/sciencelive/o/terms/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?outcome ?status ?rel ?confidence ?conclusion ?repo
                ?study ?studyLabel ?scope ?method ?deviation
                ?claim ?claimLabel ?aida ?ctype WHERE {
  GRAPH ?citog { ?citoNp ntpl:wasCreatedFromTemplate <${TPL_CITO}> . }
  ?citoNp np:hasAssertion ?ca .
  GRAPH ?ca { ?outcome ?relP <${doiUri}> . FILTER(STRSTARTS(STR(?relP), STR(cito:))) }
  BIND(STRAFTER(STR(?relP), "http://purl.org/spar/cito/") AS ?rel)
  ?outcome np:hasAssertion ?oa .
  GRAPH ?oa { ?oc slt:hasValidationStatus ?s ; slt:isOutcomeOf ?study .
    OPTIONAL { ?oc slt:hasConfidenceLevel ?cf . }
    OPTIONAL { ?oc slt:hasConclusionDescription ?conclusion . }
    OPTIONAL { ?oc slt:hasOutcomeRepository ?repo . } }
  BIND(STRAFTER(STR(?s), "/terms/") AS ?status)
  BIND(STRAFTER(STR(?cf), "/terms/") AS ?confidence)
  OPTIONAL { GRAPH ?sg { ?study rdfs:label ?studyLabel . }
    OPTIONAL { GRAPH ?sg { ?study slt:hasScopeDescription ?scope . } }
    OPTIONAL { GRAPH ?sg { ?study slt:hasMethodologyDescription ?method . } }
    OPTIONAL { GRAPH ?sg { ?study slt:hasDeviationDescription ?deviation . } }
    OPTIONAL { GRAPH ?sg { ?study slt:targetsClaim ?claim . } GRAPH ?clg { ?claim rdfs:label ?claimLabel . }
      OPTIONAL { GRAPH ?clg { ?claim slt:asAidaStatement ?aida . } }
      OPTIONAL { GRAPH ?clg { ?claim a ?ctype . FILTER(CONTAINS(STR(?ctype), "-FORRT-Claim")) } } } }
}`;
}

// Validity guard, scoped to just the outcomes we are about to show (so it stays instant): which of
// them have been retracted / invalidated / superseded by a nanopub from the SAME creator? Only the
// original author can retract their own work — a third-party `retracts` must not suppress it.
// Disapproval is intentionally not here (disagreement ≠ retraction).
function guardQuery(outcomeUris: string[]): string {
  const values = outcomeUris.map((u) => `<${u}>`).join(" ");
  return `PREFIX npx: <http://purl.org/nanopub/x/>
PREFIX dct: <http://purl.org/dc/terms/>
SELECT DISTINCT ?np WHERE {
  VALUES ?np { ${values} }
  GRAPH ?supg { ?sup ?act ?np . } VALUES ?act { npx:retracts npx:invalidates npx:supersedes }
  GRAPH ?cga { ?sup dct:creator ?cc . } GRAPH ?cgb { ?np dct:creator ?cc . }
}`;
}

export async function fetchReplications(
  doi: string,
  signal?: AbortSignal,
): Promise<ReplicationSummary> {
  const clean = doi.trim().replace(/^https?:\/\/doi\.org\//i, "");
  if (!DOI_RE.test(clean)) {
    throw new Error(`"${doi}" is not a valid DOI (expected 10.xxxx/…).`);
  }

  const rows = await executeSparql(
    chainQuery(`https://doi.org/${clean}`),
    NANOPUB_SPARQL_ENDPOINT_FULL,
    signal,
  );

  // Dedupe by outcome and keep only verdict-bearing citations.
  const byNp = new Map<string, Replication>();
  for (const r of rows) {
    const np = r.outcome;
    if (!np || byNp.has(np)) continue;
    if (r.rel && !VERDICT_RELS.has(r.rel)) continue;
    byNp.set(np, {
      outcomeNp: np,
      verdict: r.status || "",
      relation: r.rel || "",
      confidence: r.confidence || "",
      conclusion: r.conclusion || "",
      repo: r.repo || "",
      study: {
        uri: r.study || "",
        label: r.studyLabel || "",
        scope: r.scope || "",
        method: r.method || "",
        deviation: r.deviation || "",
      },
      claim: {
        uri: r.claim || "",
        label: r.claimLabel || "",
        aida: decodeAida(r.aida || ""),
        type: claimTypeLabel(r.ctype || ""),
      },
    });
  }

  // Drop retracted/superseded outcomes (best-effort: a guard failure must not hide everything).
  if (byNp.size > 0) {
    try {
      const invalid = new Set(
        (
          await executeSparql(
            guardQuery([...byNp.keys()]),
            NANOPUB_SPARQL_ENDPOINT_FULL,
            signal,
          )
        ).map((r) => npHash(r.np)),
      );
      for (const np of [...byNp.keys()]) {
        if (invalid.has(npHash(np))) byNp.delete(np);
      }
    } catch {
      /* keep all on guard failure */
    }
  }

  const replications = [...byNp.values()].sort((a, b) =>
    a.claim.type.localeCompare(b.claim.type),
  );

  return {
    doi: clean,
    count: replications.length,
    byVerdict: {
      validated: replications.filter((r) => isConfirmed(r.verdict)).length,
      partial: replications.filter((r) => isPartial(r.verdict)).length,
      contradicted: replications.filter((r) => isContradicted(r.verdict))
        .length,
    },
    replications,
  };
}
