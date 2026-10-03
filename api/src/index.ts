import { formatAllowedOrigins, getAuth } from "@/auth";
import { sessionMiddleware } from "@/auth/session-middleware";
import { Session, User } from "better-auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import health from "./health";
import np from "./np";
import notifications from "./notifications";
import orcid from "./orcid";
import proxy from "./proxy";
import signing from "./signing";
import userProfile from "./user-profile";

const app = new Hono<{
  Bindings: Env;
  Variables: {
    user: User | null;
    session: Session | null;
  };
}>();

// CORS for all endpoints
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
    allowMethods: ["POST", "GET", "PATCH", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

// Public endpoints (no auth required)
app.route("/health", health);
app.route("/user-profile", userProfile);
app.route("/orcid", orcid);

// Middleware for endpoints that require sign-in (better-auth). A rejected API
// key answers with its own 4xx and reason instead of a 500.
app.use("*", sessionMiddleware);
app.on(["POST", "GET"], "/auth/*", (c) => getAuth(c.env).handler(c.req.raw));

// Endpoints that require auth
app.route("/notifications", notifications);
app.route("/np", np);
app.route("/proxy", proxy);
app.route("/signing", signing);

export default app;
