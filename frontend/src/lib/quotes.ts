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
import { doiIriKey, normalizeDoi } from "./uri";

export type PaperQuote = {
  np: string;
  quotation: string;
  /** End of a start/end quote of a longer passage; "" for a whole quote. */
  quotationEnd: string;
  comment: string;
  creator: string;
  date: string;
  requests: number;
};

/** Upper bound on quotes fetched per paper — enough for de-duplication to see them all. */
const QUOTE_LIMIT = 200;

export async function fetchQuotesForDoi(
  doi: string,
  signal?: AbortSignal,
): Promise<PaperQuote[]> {
  const clean = normalizeDoi(doi);
  if (!clean) {
    throw new Error(`"${doi}" is not a valid DOI (expected 10.xxxx/…).`);
  }
  const rows = await executeBindSparql(
    QUOTES_BY_DOI,
    { doiKey: doiIriKey(clean), limit: String(QUOTE_LIMIT) },
    NANOPUB_SPARQL_ENDPOINT_FULL,
    signal,
  );
  const seen = new Set<string>();
  return rows
    .filter((r) => r.np && r.quotation && !seen.has(r.np) && seen.add(r.np))
    .map((r) => ({
      np: r.np,
      quotation: r.quotation,
      quotationEnd: r.quotationEnd || "",
      comment: r.comment || "",
      creator: r.creator || "",
      date: r.date || "",
      requests: Number(r.requests) || 0,
    }));
}

/** Whitespace-insensitive comparison of quotation texts. */
const normText = (s: string | undefined) =>
  (s ?? "").replace(/\s+/g, " ").trim();

/**
 * The existing quote that quotes exactly this passage — same start *and* same end
 * (a start/end quote only matches another with the same end) — or undefined.
 */
export function findSameQuote(
  quotes: PaperQuote[],
  quotation: string,
  quotationEnd?: string,
): PaperQuote | undefined {
  const start = normText(quotation);
  const end = normText(quotationEnd);
  if (!start) return undefined;
  return quotes.find(
    (q) => normText(q.quotation) === start && normText(q.quotationEnd) === end,
  );
}
