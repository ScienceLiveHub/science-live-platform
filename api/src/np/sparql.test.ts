/**
 * Unit tests for executeSparql + fetchTrig retry behaviour.
 *
 * Mocks global fetch via vi.stubGlobal so each test is deterministic. Pins
 * down the bug class we hit during dev — KP returning 503 under concurrent
 * load, masked by silent catches in the BFS. We want explicit guarantees
 * that:
 *   - executeSparql retries on transient 5xx + succeeds on later attempt
 *   - hard 4xx fails immediately (no retry)
 *   - fetchTrig has matching retry semantics
 *   - HTML body from the resolver fails fast (URI-form mismatch)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeSparql, fetchTrig, resolverUrl } from "./sparql";

const SPARQL_OK_BODY = {
  results: {
    bindings: [
      {
        np: {
          type: "uri",
          value: "https://w3id.org/sciencelive/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8",
        },
      },
    ],
  },
};

function mockResponse(
  status: number,
  bodyText: string,
  contentType = "application/sparql-results+json",
): Response {
  return new Response(bodyText, {
    status,
    headers: { "content-type": contentType },
  });
}

describe("executeSparql", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed bindings on a clean 200", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, JSON.stringify(SPARQL_OK_BODY)),
    );
    const rows = await executeSparql("SELECT ?np WHERE { ?np a ?x }");
    expect(rows).toEqual([
      {
        np: "https://w3id.org/sciencelive/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on transient 503 and succeeds on next attempt", async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(503, "<html>upstream busy</html>"))
      .mockResolvedValueOnce(
        mockResponse(200, JSON.stringify(SPARQL_OK_BODY)),
      );
    const rows = await executeSparql("SELECT ?np WHERE { ?np a ?x }");
    expect(rows.length).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries 5xx up to MAX_RETRIES then throws", async () => {
    fetchMock.mockResolvedValue(mockResponse(502, "bad gateway"));
    await expect(
      executeSparql("SELECT ?np WHERE { ?np a ?x }"),
    ).rejects.toThrow(/transient 502|after retries/);
    // Initial attempt + MAX_RETRIES (3) = 4 total calls
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("does NOT retry on a hard 4xx", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(400, "malformed query"));
    await expect(
      executeSparql("SELECT ?np WHERE { ?np a ?x }"),
    ).rejects.toThrow(/SPARQL query failed: 400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("propagates AbortError without retrying", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    fetchMock.mockRejectedValueOnce(abortError);
    await expect(
      executeSparql("SELECT ?np WHERE { ?np a ?x }"),
    ).rejects.toThrow(/aborted/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("resolverUrl", () => {
  it("rewrites sciencelive/ form to bare np/ resolver", () => {
    expect(
      resolverUrl(
        "https://w3id.org/sciencelive/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8",
      ),
    ).toBe(
      "https://w3id.org/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8",
    );
  });

  it("leaves bare np/ URIs unchanged", () => {
    const u = "https://w3id.org/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8";
    expect(resolverUrl(u)).toBe(u);
  });
});

describe("fetchTrig", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const TRIG_OK = `@prefix this: <https://w3id.org/np/RAX> .
sub:Head { this: a np:Nanopublication . }`;

  it("returns the body on a clean 200", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, TRIG_OK, "application/trig"),
    );
    const body = await fetchTrig("https://w3id.org/np/RAX");
    expect(body).toBe(TRIG_OK);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries 5xx then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(503, "busy"))
      .mockResolvedValueOnce(
        mockResponse(200, TRIG_OK, "application/trig"),
      );
    const body = await fetchTrig("https://w3id.org/np/RAX");
    expect(body).toBe(TRIG_OK);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws on HTML response (URI form not supported by resolver)", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        200,
        "<!DOCTYPE html><html>nope</html>",
        "text/html",
      ),
    );
    await expect(fetchTrig("https://w3id.org/np/RAX")).rejects.toThrow(
      /Resolver returned HTML/,
    );
  });

  it("fails immediately on a hard 404", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(404, "not found"));
    await expect(fetchTrig("https://w3id.org/np/RAX")).rejects.toThrow(
      /TriG fetch failed/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty body that starts with <!doctype html (lowercase)", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, "<!doctype html>...", "text/html"),
    );
    await expect(fetchTrig("https://w3id.org/np/RAX")).rejects.toThrow(
      /Resolver returned HTML/,
    );
  });

  it("retries 5xx until exhausted then throws", async () => {
    fetchMock.mockResolvedValue(mockResponse(503, "busy"));
    await expect(fetchTrig("https://w3id.org/np/RAX")).rejects.toThrow(
      /transient 503|after retries/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("propagates AbortError without retrying", async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    fetchMock.mockRejectedValueOnce(err);
    await expect(fetchTrig("https://w3id.org/np/RAX")).rejects.toThrow(
      /aborted/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// BOUNDARY + EDGE CASES — round 2
// =============================================================================

describe("executeSparql edge cases", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns [] when the SPARQL response has no bindings", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, JSON.stringify({ results: { bindings: [] } })),
    );
    const rows = await executeSparql("SELECT ?np WHERE { ?np a ?x }");
    expect(rows).toEqual([]);
  });

  it("returns [] when the response is missing the results key entirely", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, JSON.stringify({})));
    const rows = await executeSparql("SELECT ?np WHERE { ?np a ?x }");
    expect(rows).toEqual([]);
  });

  it("propagates a JSON parse failure as a thrown error", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, "this is not json"));
    await expect(
      executeSparql("SELECT ?np WHERE { ?np a ?x }"),
    ).rejects.toThrow();
  });

  it("retries through multiple sequential 5xxs and succeeds on the 4th attempt", async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(502, "x"))
      .mockResolvedValueOnce(mockResponse(503, "x"))
      .mockResolvedValueOnce(mockResponse(504, "x"))
      .mockResolvedValueOnce(
        mockResponse(200, JSON.stringify(SPARQL_OK_BODY)),
      );
    const rows = await executeSparql("SELECT ?np WHERE { ?np a ?x }");
    expect(rows.length).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("retries on a fetch-level network throw (not an HTTP response)", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(
        mockResponse(200, JSON.stringify(SPARQL_OK_BODY)),
      );
    const rows = await executeSparql("SELECT ?np WHERE { ?np a ?x }");
    expect(rows.length).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("resolverUrl edge cases", () => {
  it("does not double-rewrite when called twice", () => {
    const sl =
      "https://w3id.org/sciencelive/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8";
    const once = resolverUrl(sl);
    const twice = resolverUrl(once);
    expect(twice).toBe(once);
  });

  it("does NOT alter unrelated URIs", () => {
    const other = "https://example.org/foo";
    expect(resolverUrl(other)).toBe(other);
  });
});

// =============================================================================
// ROUND 3 — gap-filling failure modes
// =============================================================================

describe("executeSparql round-3 failure modes", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("throws (not retries) on a 200 response with non-JSON body", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, "<html>nope</html>"));
    await expect(
      executeSparql("SELECT ?np WHERE { ?np a ?x }"),
    ).rejects.toThrow();
    // JSON.parse throws synchronously after the 200 check — no retry.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns [] gracefully on a 200 response with empty bindings array", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, JSON.stringify({ results: { bindings: [] } })),
    );
    expect(await executeSparql("SELECT ?np WHERE { ?np a ?x }")).toEqual([]);
  });

  it("returns rows with undefined value fields when bindings rows lack `value`", async () => {
    // SPARQL endpoints SHOULD return `{ value: "..." }` per the JSON results
    // spec but defend against partial data.
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        200,
        JSON.stringify({
          results: {
            bindings: [{ np: { type: "uri" /* no value */ } }],
          },
        }),
      ),
    );
    const rows = await executeSparql("SELECT ?np WHERE { ?np a ?x }");
    expect(Array.isArray(rows)).toBe(true);
    expect(rows[0]?.np).toBeUndefined();
  });

  it("uses the abort signal when supplied", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce((_url, init) => {
      expect(init?.signal).toBe(controller.signal);
      controller.abort();
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    });
    await expect(
      executeSparql("SELECT ?np WHERE { ?np a ?x }", controller.signal),
    ).rejects.toThrow();
  });
});

describe("fetchTrig round-3 failure modes", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("detects HTML even with leading whitespace before doctype", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, "   \n  <!DOCTYPE html>\n<html>", "application/trig"),
    );
    await expect(fetchTrig("https://w3id.org/np/RAX")).rejects.toThrow(
      /Resolver returned HTML/,
    );
  });

  it("does NOT treat a TriG body that mentions <html> later as HTML", async () => {
    // A literal value like "<html>" inside a TriG string should NOT trigger
    // the HTML guard — only the FIRST 32 chars are checked.
    const trig = `@prefix : <#> .\nsub:x rdfs:label "this mentions <html>" .`;
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, trig, "application/trig"),
    );
    expect(await fetchTrig("https://w3id.org/np/RAX")).toBe(trig);
  });

  it("returns an empty body on a 200 with no content", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, "", "application/trig"));
    expect(await fetchTrig("https://w3id.org/np/RAX")).toBe("");
  });
});
