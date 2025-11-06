import "dotenv/config";
import { Hono } from "hono";
import { allowedOrigins, auth } from "./auth";
import { cors } from "hono/cors";
import health from "./health";

const app = new Hono().basePath("/api");

// Add normal API endpoints here, importing from other files where required
app.route("/health", health);
////

// Add CORS for auth endpoints
app.use(
  "/auth/**",
  cors({
    origin: (origin, _) => {
      if (allowedOrigins.includes(origin)) {
        return origin;
      }
      return undefined;
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

// Add auth, this should always be last
app.on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw));

export default app;
