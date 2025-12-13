import { formatAllowedOrigins, getAuth } from "@/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import health from "./health";
import userProfile from "./user-profile";

const app = new Hono<{ Bindings: Env }>();

// CORS for endpoints
app.use(
  cors({
    origin: (origin, c) => {
      const allowed = formatAllowedOrigins(c.env);
      if (!origin) return undefined;
      if (allowed.length === 0) return origin;
      if (allowed.includes(origin)) return origin;
      return undefined;
    },
    // TODO: ideally we should have the allowHeaders setting but it prevents localhost dev from working
    // allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

// Normal API endpoints
app.route("/health", health);
app.route("/user-profile", userProfile);

// Auth endpoints — keep last
app.on(["POST", "GET"], "/auth/*", (c) => getAuth(c.env).handler(c.req.raw));

export default app;
