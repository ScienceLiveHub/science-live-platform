import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { createDb } from "@/db";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  let isDbLive = false;
  try {
    const db = createDb(c.env);
    if (db) {
      await db.execute(sql`select 1`);
      isDbLive = true;
    }
  } catch (_) {
    isDbLive = false;
  }

  return c.json({
    status: "healthy",
    revision: "?",
    timestamp: new Date().toISOString(),
    environment: "workers",
    message: "Science Live API is running ✅",
    databaseConnected: isDbLive,
  });
});

export default app;
