import { Hono } from "hono";
import { db } from "./db";
import { sql } from "drizzle-orm";

const app = new Hono();

app.get("/", async (c) => {
  // Check whether db connection is valid and live
  const isDbLive = !!(await db.execute(sql`select 1`).catch((error) => {}));

  return c.json({
    status: "healthy",
    revision: process.env.VERCEL_GIT_COMMIT_SHA ?? "?",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    message: "Science Live API is running ✅",
    databaseConnected: isDbLive,
  });
});

export default app;
