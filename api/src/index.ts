import { Hono } from "hono";
import { cors } from "hono/cors";
import health from "./health";
import { formatAllowedOrigins, getAuth } from "./auth";

type Env = {
  FRONTEND_URL?: string;
  ALLOWED_ORIGINS?: string;
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_SECRET?: string;
  HYPERDRIVE?: { connectionString?: string };
};

const app = new Hono<{ Bindings: Env }>().basePath("/api");

// Normal API endpoints
app.route("/health", health);

// CORS for auth endpoints
app.use(
  "/auth/**",
  cors({
    origin: (origin, c) => {
      const allowed = formatAllowedOrigins(c.env);
      if (!origin) return undefined;
      if (allowed.length === 0) return origin;
      if (allowed.includes(origin)) return origin;
      return undefined;
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

// Auth endpoints — keep last
app.on(["POST", "GET"], "/auth/*", (c) => getAuth(c.env).handler(c.req.raw));

export default app;
