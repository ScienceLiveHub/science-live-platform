/**
 * Replication summary — given a paper DOI, find every independent replication of its
 * claims on the nanopub network and the verdict each reached.
 *
 * Deliberately client-side and unauthenticated: it reads only public nanopub-network data,
 * so the page works for anyone (the authenticated API stays for programmatic/registered use).
 *
 * The SPARQL lives in `queries/replications-by-paper.rq` (CiTO→DOI enumeration + chain walk +
 * admin-graph validity guard); here we just bind the DOI, run it, and shape the rows.
 */
import { REPLICATIONS_BY_PAPER } from "@/lib/queries";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_FULL } from "@/lib/sparql";

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

export async function fetchReplications(
  doi: string,
  signal?: AbortSignal,
): Promise<ReplicationSummary> {
  const clean = doi.trim().replace(/^https?:\/\/doi\.org\//i, "");
  if (!DOI_RE.test(clean)) {
    throw new Error(`"${doi}" is not a valid DOI (expected 10.xxxx/…).`);
  }

  const rows = await executeBindSparql(
    REPLICATIONS_BY_PAPER,
    { doiUri: `https://doi.org/${clean}` },
    NANOPUB_SPARQL_ENDPOINT_FULL,
    signal,
  );

  // One row per (outcome, optional-binding) — collapse to one Replication per outcome.
  const byNp = new Map<string, Replication>();
  for (const r of rows) {
    const np = r.outcome;
    if (!np || byNp.has(np)) continue;
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
