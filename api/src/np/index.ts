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
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

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

    // TODO: if we want to utilize short-lived caching, we can enable this
    // to reduce server load.  Other options may exist depending on deployment,
    // e.g. within Cloudflare.
    // Add cache headers for immutable nanopub data
    // c.header("Cache-Control", "public, max-age=300"); // 5 minutes

    return c.json(constellation);
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
