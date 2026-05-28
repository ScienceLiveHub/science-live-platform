import { NANOPUB_SPARQL_ENDPOINT_FULL } from "./queries";

type SparqlBindingValue = { type: string; value: string };
type SparqlResults = {
  results: { bindings: Record<string, SparqlBindingValue>[] };
};

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 600;

/**
 * Error thrown when an upstream service (SPARQL endpoint, TriG resolver)
 * fails after retries or returns an unexpected response. This allows the
 * route handler to distinguish upstream failures (502) from programmer
 * errors (500).
 */
export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/**
 * POST a SPARQL query to the KnowledgePixels endpoint and return rows as
 * `{ var: stringValue }` objects. Retries on transient 5xx / network errors
 * with exponential backoff — KP's nginx returns intermittent 503s under
 * concurrent load.
 */
export async function executeSparql(
  query: string,
  signal?: AbortSignal,
): Promise<Record<string, string>[]> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const wait = RETRY_BASE_MS * 2 ** (attempt - 1);
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
    }
    // Only the network call is in try/catch — body validation throws
    // non-retryable errors that must bubble out.
    let res: Response;
    try {
      res = await fetch(NANOPUB_SPARQL_ENDPOINT_FULL, {
        method: "POST",
        body: new URLSearchParams({ query }),
        headers: {
          Accept: "application/sparql-results+json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "science-live-platform-api/np-constellation",
        },
        signal,
      });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") throw e;
      lastError = e;
      continue;
    }
    if (res.status >= 500 && res.status < 600) {
      lastError = new Error(`SPARQL transient ${res.status} ${res.statusText}`);
      continue;
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new UpstreamError(
        `SPARQL query failed: ${res.status} ${res.statusText}: ${detail.slice(0, 200)}`,
      );
    }
    const data = (await res.json()) as SparqlResults;
    return (data.results?.bindings ?? []).map((row) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) out[k] = v.value;
      return out;
    });
  }
  throw new UpstreamError(
    lastError instanceof Error
      ? lastError.message
      : "SPARQL query failed after retries",
    lastError,
  );
}

/**
 * The W3ID resolver serves TriG for `https://w3id.org/np/RA…` URIs.
 * Science Live URIs of the form `https://w3id.org/sciencelive/np/RA…`
 * redirect to the platform's HTML viewer, so swap the prefix before fetching.
 */
export function resolverUrl(uri: string): string {
  return uri.replace(
    "https://w3id.org/sciencelive/np/",
    "https://w3id.org/np/",
  );
}

/**
 * Fetch a nanopub URI as TriG. Throws if the resolver returns HTML
 * (a sign the URI form isn't supported by the W3ID redirect). Retries
 * transient 5xx the same way executeSparql does.
 */
export async function fetchTrig(
  uri: string,
  signal?: AbortSignal,
): Promise<string> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const wait = RETRY_BASE_MS * 2 ** (attempt - 1);
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
    }
    let res: Response;
    try {
      res = await fetch(resolverUrl(uri), {
        headers: {
          Accept: "application/trig, application/n-quads;q=0.9, */*;q=0.5",
          "User-Agent": "science-live-platform-api/np-constellation",
        },
        signal,
      });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") throw e;
      lastError = e;
      continue;
    }
    if (res.status >= 500 && res.status < 600) {
      lastError = new Error(
        `TriG fetch transient ${res.status} ${res.statusText}`,
      );
      continue;
    }
    if (!res.ok) {
      throw new UpstreamError(
        `TriG fetch failed for ${uri}: ${res.status} ${res.statusText}`,
      );
    }
    const body = await res.text();
    const stripped = body.trimStart().slice(0, 32).toLowerCase();
    if (stripped.startsWith("<!doctype html") || stripped.startsWith("<html")) {
      throw new UpstreamError(
        `Resolver returned HTML for ${uri}; expected TriG. The URI form may not be supported by the W3ID redirect.`,
      );
    }
    return body;
  }
  throw new UpstreamError(
    lastError instanceof Error
      ? lastError.message
      : "TriG fetch failed after retries",
    lastError,
  );
}
