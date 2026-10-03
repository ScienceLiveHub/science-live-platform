import { isAPIError } from "better-auth/api";
import type { MiddlewareHandler } from "hono";
import { getAuth } from "@/auth";

/**
 * Attach the signed-in user and session (or null) to the request context.
 *
 * Sessions come from cookies or, through better-auth's api-key plugin
 * (`enableSessionForAPIKeys`), from an `x-api-key` header. When that header
 * holds a key the plugin rejects — not found, disabled, expired — `getSession`
 * throws an APIError. Uncaught, every such request became a bare HTTP 500, on
 * public routes too, which hid the reason and looked like a server outage. The
 * plugin's own status (401/403/404) and message are returned instead.
 */
export const sessionMiddleware: MiddlewareHandler = async (c, next) => {
  let session = null;
  try {
    session = await getAuth(c.env).api.getSession({
      headers: c.req.raw.headers,
    });
  } catch (err) {
    if (!isAPIError(err)) throw err;
    const e = err as {
      statusCode?: number;
      message?: string;
      body?: { message?: string; code?: string };
    };
    const status = e.statusCode && e.statusCode >= 400 && e.statusCode < 500 ? e.statusCode : 401;
    return c.json(
      {
        error: e.body?.message || e.message || "Authentication failed",
        code: e.body?.code ?? null,
      },
      status as 400 | 401 | 403 | 404,
    );
  }

  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  return next();
};
