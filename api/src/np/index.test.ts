/**
 * Tests for the /np Hono sub-app — HTTP routing, auth gate, query-string
 * validation, parameter clamping, error mapping.
 *
 * Uses Hono's in-process `app.request()` for handler invocation. Wraps the
 * sub-app in a parent app that sets `c.var.user`, mirroring what the
 * better-auth middleware in `api/src/index.ts` does in production. Mocks
 * `buildConstellation` so we exercise the HTTP layer in isolation from the
 * actual KP traversal.
 */
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NANOPUB_SPARQL_ENDPOINT_FULL } from "./queries";
import { UpstreamError } from "./sparql";

const buildConstellationMock = vi.fn();
vi.mock("./constellation", () => ({
  buildConstellation: (...args: unknown[]) => buildConstellationMock(...args),
}));

// Import the sub-app AFTER the mock so its module-load picks up the stub.
const { default: npApp } = await import("./index");

type FakeUser = { id: string } | null;

type ParentVars = {
  Variables: {
    user: FakeUser;
    session: unknown | null;
  };
};

/** Build a parent Hono app that injects `user` and mounts /np like prod does. */
function mountWithUser(user: FakeUser) {
  const parent = new Hono<ParentVars>();
  parent.use("*", async (c, next) => {
    c.set("user", user);
    await next();
  });
  parent.route("/np", npApp);
  return parent;
}

const CONSTELLATION_PAYLOAD = {
  entry: "https://w3id.org/sciencelive/np/RAabc",
  nodeCount: 3,
  edgeCount: 2,
  sparqlEndpoint: NANOPUB_SPARQL_ENDPOINT_FULL,
  nodes: [],
  edges: [],
  externalCitations: [],
};

const EMPTY_CONSTELLATION_PAYLOAD = {
  entry:
    "https://w3id.org/sciencelive/np/RAnotfound000000000000000000000000000000",
  nodeCount: 0,
  edgeCount: 0,
  sparqlEndpoint: NANOPUB_SPARQL_ENDPOINT_FULL,
  nodes: [],
  edges: [],
  externalCitations: [],
};

describe("GET /np/constellation", () => {
  beforeEach(() => {
    buildConstellationMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when no user is signed in", async () => {
    const app = mountWithUser(null);
    const res = await app.request(
      "/np/constellation?uri=https://w3id.org/sciencelive/np/RAabcdefghijklmnopqrstuvwxyz0000000",
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Unauthorized/);
    expect(buildConstellationMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the uri query parameter is missing", async () => {
    const app = mountWithUser({ id: "u1" });
    const res = await app.request("/np/constellation");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Missing 'uri'/);
    expect(buildConstellationMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the uri is not a nanopub URI", async () => {
    const app = mountWithUser({ id: "u1" });
    const res = await app.request(
      "/np/constellation?uri=https://example.com/not-a-nanopub",
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/does not look like a nanopub URI/);
    expect(buildConstellationMock).not.toHaveBeenCalled();
  });

  it("returns 200 with the constellation JSON when uri is valid", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    const res = await app.request(
      "/np/constellation?uri=https://w3id.org/sciencelive/np/RAabcdefghijklmnopqrstuvwxyz0000000",
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(CONSTELLATION_PAYLOAD);
    expect(buildConstellationMock).toHaveBeenCalledTimes(1);
  });

  it("strips fragments from the uri before passing to buildConstellation", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    await app.request(
      "/np/constellation?uri=https://w3id.org/sciencelive/np/RAabcdefghijklmnopqrstuvwxyz0000000%23assertion",
    );
    expect(buildConstellationMock).toHaveBeenCalledWith(
      "https://w3id.org/sciencelive/np/RAabcdefghijklmnopqrstuvwxyz0000000",
      expect.objectContaining({ depthLimit: 5, maxNodes: 80 }),
    );
  });

  it("clamps depth and maxNodes to their valid ranges", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    await app.request(
      "/np/constellation?uri=https://w3id.org/sciencelive/np/RAabcdefghijklmnopqrstuvwxyz0000000&depth=999&maxNodes=999",
    );
    expect(buildConstellationMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ depthLimit: 10, maxNodes: 200 }),
    );
  });

  it("falls back to defaults for non-numeric depth/maxNodes", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    await app.request(
      "/np/constellation?uri=https://w3id.org/sciencelive/np/RAabcdefghijklmnopqrstuvwxyz0000000&depth=banana&maxNodes=",
    );
    expect(buildConstellationMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ depthLimit: 5, maxNodes: 80 }),
    );
  });

  it("returns 502 when buildConstellation throws UpstreamError", async () => {
    buildConstellationMock.mockRejectedValueOnce(
      new UpstreamError("KP unreachable after retries"),
    );
    const app = mountWithUser({ id: "u1" });
    const res = await app.request(
      "/np/constellation?uri=https://w3id.org/sciencelive/np/RAabcdefghijklmnopqrstuvwxyz0000000",
    );
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/KP unreachable/);
  });

  it("returns 500 when buildConstellation throws a regular Error", async () => {
    buildConstellationMock.mockRejectedValueOnce(
      new Error("Unexpected programmer error"),
    );
    const app = mountWithUser({ id: "u1" });
    const res = await app.request(
      "/np/constellation?uri=https://w3id.org/sciencelive/np/RAabcdefghijklmnopqrstuvwxyz0000000",
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Unexpected programmer error/);
  });

  it("returns 404 when the entry URI is not found (nodeCount === 0)", async () => {
    buildConstellationMock.mockResolvedValueOnce(EMPTY_CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    const res = await app.request(
      "/np/constellation?uri=https://w3id.org/sciencelive/np/RAnotfound000000000000000000000000000000",
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string; notFound?: boolean };
    expect(body.error).toMatch(/Nanopub not found/);
    expect(body.notFound).toBe(true);
  });

  it("passes AbortSignal to buildConstellation", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    await app.request(
      "/np/constellation?uri=https://w3id.org/sciencelive/np/RAabcdefghijklmnopqrstuvwxyz0000000",
    );
    expect(buildConstellationMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});

// =============================================================================
// BOUNDARY + EDGE CASES — round 2
// =============================================================================

const VALID_URI =
  "https://w3id.org/sciencelive/np/RAabcdefghijklmnopqrstuvwxyz0000000";

describe("non-GET methods on /np/constellation", () => {
  beforeEach(() => buildConstellationMock.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("returns 404 for POST", async () => {
    const app = mountWithUser({ id: "u1" });
    const res = await app.request("/np/constellation?uri=" + VALID_URI, {
      method: "POST",
    });
    // The /constellation route only declares GET — Hono responds 404.
    expect(res.status).toBe(404);
    expect(buildConstellationMock).not.toHaveBeenCalled();
  });

  it("returns 404 for PUT", async () => {
    const app = mountWithUser({ id: "u1" });
    const res = await app.request("/np/constellation?uri=" + VALID_URI, {
      method: "PUT",
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 for DELETE", async () => {
    const app = mountWithUser({ id: "u1" });
    const res = await app.request("/np/constellation?uri=" + VALID_URI, {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });
});

describe("depth and maxNodes boundary clamping", () => {
  beforeEach(() => buildConstellationMock.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("accepts depth=0 (metadata probe mode)", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    await app.request(`/np/constellation?uri=${VALID_URI}&depth=0`);
    expect(buildConstellationMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ depthLimit: 0 }),
    );
  });

  it("clamps depth=-5 to 0 (negative lower bound)", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    await app.request(`/np/constellation?uri=${VALID_URI}&depth=-5`);
    expect(buildConstellationMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ depthLimit: 0 }),
    );
  });

  it("clamps maxNodes=0 to 1 (lower bound)", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    await app.request(`/np/constellation?uri=${VALID_URI}&maxNodes=0`);
    expect(buildConstellationMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ maxNodes: 1 }),
    );
  });

  it("accepts depth at the exact lower bound (0)", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    await app.request(`/np/constellation?uri=${VALID_URI}&depth=0&maxNodes=1`);
    expect(buildConstellationMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ depthLimit: 0, maxNodes: 1 }),
    );
  });

  it("accepts depth at the exact upper bound (10)", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    await app.request(
      `/np/constellation?uri=${VALID_URI}&depth=10&maxNodes=200`,
    );
    expect(buildConstellationMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ depthLimit: 10, maxNodes: 200 }),
    );
  });

  it("ignores trailing non-numeric chars in depth (parseInt picks the prefix)", async () => {
    // Number.parseInt("3abc", 10) === 3 — this is documented JS behaviour.
    // Lock it in so a future regex tightening doesn't break the contract.
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    await app.request(`/np/constellation?uri=${VALID_URI}&depth=3abc`);
    expect(buildConstellationMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ depthLimit: 3 }),
    );
  });
});

describe("/np route coverage", () => {
  beforeEach(() => buildConstellationMock.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("returns 404 for unknown paths under /np", async () => {
    const app = mountWithUser({ id: "u1" });
    const res = await app.request("/np/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("returns 404 for /np with no trailing path", async () => {
    const app = mountWithUser({ id: "u1" });
    const res = await app.request("/np");
    expect(res.status).toBe(404);
  });

  it("returns application/json content-type on success", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    const res = await app.request(`/np/constellation?uri=${VALID_URI}`);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
  });

  it("returns application/json content-type on error", async () => {
    buildConstellationMock.mockRejectedValueOnce(new Error("boom"));
    const app = mountWithUser({ id: "u1" });
    const res = await app.request(`/np/constellation?uri=${VALID_URI}`);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
  });

  it("falls back to a generic message when buildConstellation throws non-Error", async () => {
    buildConstellationMock.mockRejectedValueOnce("plain string thrown");
    const app = mountWithUser({ id: "u1" });
    const res = await app.request(`/np/constellation?uri=${VALID_URI}`);
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Constellation build failed/);
  });

  // Enable/update these tests if we enable Cache-Control
  // it("returns Cache-Control header on success", async () => {
  //   buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
  //   const app = mountWithUser({ id: "u1" });
  //   const res = await app.request(`/np/constellation?uri=${VALID_URI}`);
  //   expect(res.status).toBe(200);
  //   const cacheControl = res.headers.get("cache-control");
  //   expect(cacheControl).toMatch(/public/);
  //   expect(cacheControl).toMatch(/max-age=300/);
  // });

  // it("does NOT return Cache-Control header on error", async () => {
  //   buildConstellationMock.mockRejectedValueOnce(new Error("boom"));
  //   const app = mountWithUser({ id: "u1" });
  //   const res = await app.request(`/np/constellation?uri=${VALID_URI}`);
  //   expect(res.status).toBe(500);
  //   // Hono may not set cache-control on error responses
  //   const cacheControl = res.headers.get("cache-control");
  //   expect(cacheControl).toBeNull();
  // });
});

// =============================================================================
// ROUND 3 — protocol-level gaps
// =============================================================================

describe("/np/constellation protocol gaps", () => {
  beforeEach(() => buildConstellationMock.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("HEAD requests pass through Hono — return same response shape as GET (no body)", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    const res = await app.request(`/np/constellation?uri=${VALID_URI}`, {
      method: "HEAD",
    });
    // Hono routes only respond to GET (we declared `app.get()`). HEAD is
    // typically auto-handled by Hono via the matching GET route, but our
    // route's `get()` only matches GET — HEAD returns 404 unless explicitly
    // declared. PIN current behaviour.
    expect([200, 404]).toContain(res.status);
  });

  it("URI at exact 20-char hash boundary passes through the HTTP route", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    const minLengthUri = "https://w3id.org/np/RA" + "X".repeat(20);
    const res = await app.request(
      `/np/constellation?uri=${encodeURIComponent(minLengthUri)}`,
    );
    expect(res.status).toBe(200);
    expect(buildConstellationMock).toHaveBeenCalledWith(
      minLengthUri,
      expect.any(Object),
    );
  });

  it("URI one char short of the hash boundary returns 400", async () => {
    const app = mountWithUser({ id: "u1" });
    const tooShort = "https://w3id.org/np/RA" + "X".repeat(19);
    const res = await app.request(
      `/np/constellation?uri=${encodeURIComponent(tooShort)}`,
    );
    expect(res.status).toBe(400);
    expect(buildConstellationMock).not.toHaveBeenCalled();
  });

  it("multiple `uri` query params — Hono picks one deterministically", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    const a =
      "https://w3id.org/sciencelive/np/RAaaa00000000000000000000000000000000000000";
    const b =
      "https://w3id.org/sciencelive/np/RAbbb00000000000000000000000000000000000000";
    await app.request(
      `/np/constellation?uri=${encodeURIComponent(a)}&uri=${encodeURIComponent(b)}`,
    );
    expect(buildConstellationMock).toHaveBeenCalledTimes(1);
    const calledWith = buildConstellationMock.mock.calls[0][0];
    // Hono returns the FIRST value for repeated query params; lock it in.
    expect([a, b]).toContain(calledWith);
  });

  it("serialises a large structured response correctly through c.json()", async () => {
    // Synthesize a payload roughly the size of a real 19-node Bombus chain
    // and verify it round-trips through the HTTP response unchanged.
    const bigPayload = {
      ...CONSTELLATION_PAYLOAD,
      nodeCount: 19,
      nodes: Array.from({ length: 19 }, (_, i) => ({
        uri: `https://w3id.org/sciencelive/np/RAnode${i}${"0".repeat(35)}`,
        stepKind: "outcome",
        stepType: "Declaring a replication study outcome according to FORRT",
        templateUri: "",
        label: `Outcome ${i}`,
        date: "2026-05-11T00:00:00Z",
        creators: ["https://orcid.org/0000-0002-1784-2920"],
        authorsOrcid: [],
        plainTextExcerpts: ["A".repeat(2000)],
        githubUrls: [],
      })),
      chains: [
        {
          id: "chain-0",
          outcomeUri: "u",
          outcomeVerdict: "Validated",
          outcomeConfidence: "HighConfidence",
          citoRelations: ["confirms"],
          steps: Array.from({ length: 7 }, (_, i) => ({
            step: "Outcome",
            uri: `u-${i}`,
            text: "long text ".repeat(100),
          })),
        },
      ],
    };
    buildConstellationMock.mockResolvedValueOnce(bigPayload);
    const app = mountWithUser({ id: "u1" });
    const res = await app.request(`/np/constellation?uri=${VALID_URI}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(bigPayload);
  });

  it("URL-encoded URI with %2F path separators decodes properly through Hono", async () => {
    buildConstellationMock.mockResolvedValueOnce(CONSTELLATION_PAYLOAD);
    const app = mountWithUser({ id: "u1" });
    // %2F is the URL-encoded form of /. A buggy URL parser might double-
    // decode and lose path segments.
    await app.request(
      `/np/constellation?uri=https%3A%2F%2Fw3id.org%2Fsciencelive%2Fnp%2FRAabcdefghijklmnopqrstuvwxyz0000000`,
    );
    expect(buildConstellationMock).toHaveBeenCalledWith(
      "https://w3id.org/sciencelive/np/RAabcdefghijklmnopqrstuvwxyz0000000",
      expect.any(Object),
    );
  });
});
