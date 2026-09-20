import { Session, User } from "better-auth";
import { Hono } from "hono";
import { buildConstellation } from "./constellation";
import { UpstreamError } from "./sparql";
import { canonicalNanopubUri } from "./trig";

const app = new Hono<{
  Bindings: Env;
  Variables: {
    user: User | null;
    session: Session | null;
  };
}>();

// This endpoint aborts if it takes longer than this many ms to process.
// Adjust as needed. Deployment may have its own limits regardless.
const ENDPOINT_TIMEOUT = 60_000; // 60s

// A constellation aggregates published (immutable) nanopublications and only
// changes when a *new* nanopub extends it, which is rare. Caching the response
// at the Cloudflare edge turns repeat views — the common case for a shared story
// page — from a ~1-minute walk into an instant hit. Kept modest so a newly
// published replication still surfaces within the hour; pre-warm featured
// stories to keep them permanently hot.
const CACHE_TTL_SECONDS = 3600; // 1 hour

/**
 * GET /np/constellation?uri=<nanopub-uri>&depth=<n>&maxNodes=<n>
 *
 * Bidirectional FORRT-chain traversal from the given nanopub URI. Returns
 * the full reachable constellation as flat `nodes` + `edges` arrays plus
 * external (non-nanopub) citation URIs (typically DOIs).
 *
 * Auth: signed-in users (or API key) only for v1 (sits behind the better-auth
 * session middleware in api/src/index.ts). Paid-tier gating is a future
 * possibility.
 *
 * Query params:
 *   - uri: required nanopub URI to start traversal from
 *   - depth: 0-10, default 5. Depth 0 returns just the entry node metadata.
 *   - maxNodes: 1-200, default 80. Max nodes to include in constellation.
 *
 */
app.get("/constellation", async (c) => {
  // Public read. A constellation only aggregates already-public nanopublications
  // from the network, so anyone can view a reader-facing story page (/np/story)
  // without an account — reading public data is not what authentication is for
  // (that gates *creating/signing* nanopubs). Abuse is bounded by the
  // depth/maxNodes/timeout limits below. NOTE: the FORRT replication template's
  // build_story.py still requires a Science Live API key, so template/offline
  // users continue to authenticate and get a key for the programmatic path.

  const rawUri = c.req.query("uri");
  if (!rawUri) return c.json({ error: "Missing 'uri' query parameter" }, 400);

  const entry = canonicalNanopubUri(rawUri);
  if (!entry) {
    return c.json(
      {
        error: `'${rawUri}' does not look like a nanopub URI (expected https://w3id.org/[sciencelive/]np/RA…).`,
      },
      400,
    );
  }

  const depthLimit = clampInt(c.req.query("depth"), 0, 10, 5);
  const maxNodes = clampInt(c.req.query("maxNodes"), 1, 200, 80);

  // Serve from the Cloudflare edge cache if we've already walked this exact
  // constellation. The key is normalised to the canonical (uri, depth, maxNodes)
  // so it's independent of query-param order or extras.
  const cacheKey = new Request(
    `https://np-constellation.cache/?uri=${encodeURIComponent(entry)}&depth=${depthLimit}&maxNodes=${maxNodes}`,
  );
  // `caches` is a Workers-runtime global; absent under plain unit tests / other
  // hosts, so guard it and fall through to a live walk when there's no cache.
  const cache =
    typeof caches !== "undefined"
      ? await caches.open("np-constellation")
      : null;
  const cached = cache ? await cache.match(cacheKey) : null;
  if (cached) return cached;

  // Request-level timeout with AbortSignal
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ENDPOINT_TIMEOUT);

  try {
    const constellation = await buildConstellation(entry, {
      depthLimit,
      maxNodes,
      signal: ac.signal,
    });

    // Return 404 if entry URI was not found (nodeCount === 0)
    if (constellation.nodeCount === 0) {
      return c.json(
        {
          error: `Nanopub not found: ${entry}`,
          notFound: true,
        },
        404,
      );
    }

    // Cache the successful walk at the edge (see CACHE_TTL_SECONDS). Only 200s
    // are cached — 404s/timeouts fall through so a transient failure isn't stuck.
    const response = c.json(constellation);
    response.headers.set(
      "Cache-Control",
      `public, max-age=${CACHE_TTL_SECONDS}`,
    );
    if (cache) {
      const put = cache.put(cacheKey, response.clone());
      if (c.executionCtx) c.executionCtx.waitUntil(put);
      else await put;
    }
    return response;
  } catch (err) {
    // Differentiate upstream failures (502) from programmer errors (500)
    if (err instanceof UpstreamError) {
      return c.json({ error: err.message }, 502);
    }
    if (err instanceof Error && err.name === "AbortError") {
      return c.json({ error: "Request timeout" }, 504);
    }
    // Log unexpected errors for debugging
    console.error("Unexpected error in /np/constellation:", err);
    const message =
      err instanceof Error ? err.message : "Constellation build failed";
    return c.json({ error: message }, 500);
  } finally {
    clearTimeout(timer);
  }
});

function clampInt(
  raw: string | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export default app;
