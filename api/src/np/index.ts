import { Session, User } from "better-auth";
import { Hono } from "hono";
import { buildConstellation } from "./constellation";
import { canonicalNanopubUri } from "./trig";

const app = new Hono<{
  Bindings: Env;
  Variables: {
    user: User | null;
    session: Session | null;
  };
}>();

/**
 * GET /np/constellation?uri=<nanopub-uri>&depth=<n>&maxNodes=<n>
 *
 * Bidirectional FORRT-chain traversal from the given nanopub URI. Returns
 * the full reachable constellation as flat `nodes` + `edges` arrays plus
 * external (non-nanopub) citation URIs (typically DOIs).
 *
 * Auth: signed-in users only for v1 (sits behind the better-auth session
 * middleware in api/src/index.ts). API-key auth + paid-tier gating arrive
 * in Week 3 of docs/plans/nanopub-query-api.md.
 *
 * NOTE: the plan specifies `GET /api/np/{uri}/constellation` (path param).
 * Encoded URIs in path params are fragile, so v1 uses a query param. The
 * path-param form can be added as an alias later.
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

  const depthLimit = clampInt(c.req.query("depth"), 1, 10, 5);
  const maxNodes = clampInt(c.req.query("maxNodes"), 1, 200, 80);

  try {
    const constellation = await buildConstellation(entry, {
      depthLimit,
      maxNodes,
    });
    return c.json(constellation);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Constellation build failed";
    return c.json({ error: message }, 502);
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
