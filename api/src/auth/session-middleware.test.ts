import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("@/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

const { sessionMiddleware } = await import("./session-middleware");

function app() {
  const a = new Hono<{ Variables: { user: unknown; session: unknown } }>();
  a.use("*", sessionMiddleware);
  a.get("/public", (c) => c.json({ user: c.get("user") }));
  return a;
}

/** Shape of better-auth's APIError (better-call): name, statusCode, body. */
function apiError(statusCode: number, code: string, message: string) {
  return Object.assign(new Error(message), {
    name: "APIError",
    status: statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
    statusCode,
    body: { code, message },
  });
}

describe("sessionMiddleware", () => {
  it("lets anonymous requests through", async () => {
    getSession.mockResolvedValueOnce(null);
    const res = await app().request("/public");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: null });
  });

  it("sets the user for a valid session", async () => {
    getSession.mockResolvedValueOnce({ user: { id: "u1" }, session: { id: "s1" } });
    const res = await app().request("/public", { headers: { "x-api-key": "sl_valid" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { id: "u1" } });
  });

  it("answers a rejected API key with its own status and reason, not 500", async () => {
    getSession.mockRejectedValueOnce(apiError(401, "INVALID_API_KEY", "Invalid API key."));
    const res = await app().request("/public", { headers: { "x-api-key": "nonsense" } });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid API key.", code: "INVALID_API_KEY" });
  });

  it("keeps a 403 from the plugin as 403", async () => {
    getSession.mockRejectedValueOnce(apiError(403, "INVALID_API_KEY", "Invalid API key."));
    const res = await app().request("/public", { headers: { "x-api-key": "short" } });
    expect(res.status).toBe(403);
  });

  it("still raises errors that are not authentication errors", async () => {
    getSession.mockRejectedValueOnce(new Error("database down"));
    const res = await app().request("/public");
    expect(res.status).toBe(500);
  });
});
