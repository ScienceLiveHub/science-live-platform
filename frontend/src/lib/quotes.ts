/**
 * Quotes of a paper — given a DOI, find the Quote-with-comment nanopubs that state a
 * claim from it, and how many replication requests already point to each. Used by the
 * replication-request wizard to reuse an existing quote instead of writing a new one.
 *
 * Client-side and unauthenticated: public nanopub-network data only. The SPARQL lives
 * in `queries/quotes-by-doi.rq`; here we normalise the DOI, run it and shape the rows.
 */
import { QUOTES_BY_DOI } from "./queries";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_FULL } from "./sparql";

export type PaperQuote = {
  np: string;
  quotation: string;
  comment: string;
  creator: string;
  date: string;
  requests: number;
};

const DOI_RE = /^10\.\d{3,}\/\S+$/;

/** "https://doi.org/10.1/x" or "doi:10.1/x" → "10.1/x"; null if not a DOI. */
export function normaliseDoi(input: string): string | null {
  const clean = input
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:/i, "");
  return DOI_RE.test(clean) ? clean : null;
}

export async function fetchQuotesForDoi(
  doi: string,
  signal?: AbortSignal,
): Promise<PaperQuote[]> {
  const clean = normaliseDoi(doi);
  if (!clean) {
    throw new Error(`"${doi}" is not a valid DOI (expected 10.xxxx/…).`);
  }
  const rows = await executeBindSparql(
    QUOTES_BY_DOI,
    { doiUri: `https://doi.org/${clean}` },
    NANOPUB_SPARQL_ENDPOINT_FULL,
    signal,
  );
  return rows
    .filter((r) => r.np && r.quotation)
    .map((r) => ({
      np: r.np,
      quotation: r.quotation,
      comment: r.comment || "",
      creator: r.creator || "",
      date: r.date || "",
      requests: Number(r.requests) || 0,
    }));
}
