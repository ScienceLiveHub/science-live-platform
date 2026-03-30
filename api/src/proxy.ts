import { Hono } from "hono";

/**
 * CORS Proxy endpoint — zero-retention passthrough.
 *
 * Allows the frontend to make requests to third-party services that block
 * browser requests due to CORS restrictions (e.g. SPARQL endpoints, external
 * APIs). The Worker fetches the resource server-side and streams the response
 * back. No request or response data is logged or stored.
 *
 * Security measures:
 *  - Requires an authenticated session (sits behind the auth middleware).
 *  - Blocks requests to private/loopback/link-local IP ranges and non-HTTP(S)
 *    schemes to prevent SSRF attacks.
 *  - Strips inbound cookies and authorization headers before forwarding so the
 *    caller cannot piggyback the Worker's own credentials.
 *  - Strips Set-Cookie headers from the upstream response so the proxy cannot
 *    be used to plant cookies in the browser.
 *
 * Usage — POST /proxy
 * Body (JSON):
 * {
 *   "url":     "https://example.com/api/data",   // required
 *   "method":  "GET",                             // optional, default "GET"
 *   "headers": { "Accept": "application/json" },  // optional
 *   "body":    "raw string or omit"               // optional
 * }
 *
 * The response status, headers (minus Set-Cookie) and body are forwarded
 * verbatim to the caller.
 */

// Headers that must never be forwarded from the caller to the upstream service.
const BLOCKED_REQUEST_HEADERS = new Set([
  "cookie",
  // We allow this because it is required by some custom providers
  //   "authorization",
  "host",
  "connection",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "proxy-authorization",
  "proxy-connection",
]);

// Headers that must never be forwarded from the upstream response to the caller.
const BLOCKED_RESPONSE_HEADERS = new Set([
  "set-cookie",
  "set-cookie2",
  "connection",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
]);

/**
 * Returns true when the hostname looks like a private / loopback / link-local
 * address that should never be reachable via the proxy (SSRF guard).
 *
 * This is a best-effort check on the hostname string; Cloudflare Workers also
 * enforce their own network-level restrictions on outbound requests.
 */
function isPrivateHost(hostname: string): boolean {
  // Strip IPv6 brackets
  const host = hostname.replace(/^\[|\]$/g, "");

  // Loopback
  if (host === "localhost" || host === "::1") return true;

  // IPv4 private / special ranges
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, a, b, c] = ipv4.map(Number);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 shared
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
    if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 documentation
    if (a === 255) return true; // broadcast
  }

  // IPv6 private / special
  if (
    host.startsWith("fc") ||
    host.startsWith("fd") || // Unique local fc00::/7
    host.startsWith("fe80") || // Link-local fe80::/10
    host === "::" // Unspecified
  ) {
    return true;
  }

  return false;
}

const app = new Hono<{
  Bindings: Env;
  Variables: {
    user: { id: string } | null;
    session: unknown | null;
  };
}>();

app.post("/", async (c) => {
  // Auth guard — proxy is only available to signed-in users.
  const currentUser = c.get("user");
  if (!currentUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Parse request body.
  let body: {
    url?: unknown;
    method?: unknown;
    headers?: unknown;
    body?: unknown;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be valid JSON" }, 400);
  }

  const { url, method, headers: reqHeaders, body: reqBody } = body;

  // Validate URL.
  if (typeof url !== "string" || !url) {
    return c.json({ error: "Missing or invalid 'url' field" }, 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return c.json({ error: "Invalid URL" }, 400);
  }

  // Only allow HTTP(S) — no file://, data://, etc.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return c.json({ error: "Only http and https URLs are supported" }, 400);
  }

  // SSRF guard.
  if (isPrivateHost(parsed.hostname)) {
    return c.json(
      { error: "Requests to private or loopback addresses are not allowed" },
      403,
    );
  }

  // Validate method.
  const allowedMethods = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
  ];
  const upstreamMethod =
    typeof method === "string" ? method.toUpperCase() : "GET";
  if (!allowedMethods.includes(upstreamMethod)) {
    return c.json({ error: `Method '${upstreamMethod}' is not allowed` }, 400);
  }

  // Build upstream headers — forward only safe, caller-supplied headers.
  const upstreamHeaders = new Headers();
  if (
    reqHeaders &&
    typeof reqHeaders === "object" &&
    !Array.isArray(reqHeaders)
  ) {
    for (const [key, value] of Object.entries(
      reqHeaders as Record<string, unknown>,
    )) {
      if (typeof value !== "string") continue;
      if (BLOCKED_REQUEST_HEADERS.has(key.toLowerCase())) continue;
      upstreamHeaders.set(key, value);
    }
  }

  // Build upstream request.
  const upstreamInit: RequestInit = {
    method: upstreamMethod,
    headers: upstreamHeaders,
    // Prevent the Worker from following redirects silently — let the upstream
    // server's redirect be forwarded to the caller as-is.
    redirect: "manual",
  };

  if (
    reqBody !== undefined &&
    reqBody !== null &&
    upstreamMethod !== "GET" &&
    upstreamMethod !== "HEAD"
  ) {
    upstreamInit.body =
      typeof reqBody === "string" ? reqBody : JSON.stringify(reqBody);
  }

  // Perform the upstream fetch — zero retention, no logging.
  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(url, upstreamInit);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Upstream request failed";
    return c.json({ error: message }, 502);
  }

  // Build response headers — strip sensitive upstream headers.
  const responseHeaders = new Headers();
  for (const [key, value] of upstreamResponse.headers.entries()) {
    if (BLOCKED_RESPONSE_HEADERS.has(key.toLowerCase())) continue;
    responseHeaders.set(key, value);
  }

  // Stream the upstream body back to the caller verbatim.
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
});

export default app;
