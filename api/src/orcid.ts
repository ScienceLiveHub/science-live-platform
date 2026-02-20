import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";

const app = new Hono<{ Bindings: Env }>();

// Return a display name for the given orcid URI. We proxy it through our API to avoid CORS issues
app.get("/display-name", async (c) => {
  const orcid = c.req.query("orcid");
  if (!orcid) {
    return c.json({ error: "Missing 'orcid' query parameter" }, 400);
  }

  try {
    const response = await fetch(`${orcid}/public-record.json`);
    if (!response.ok) {
      return c.json(
        { error: "Failed to fetch ORCID record" },
        (response?.status as ContentfulStatusCode) || 500,
      );
    }
    const data = await response.json();
    const displayName = data?.displayName;
    return c.json({ displayName });
  } catch (error) {
    console.error("Error fetching ORCID display name:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
