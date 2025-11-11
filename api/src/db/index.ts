import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

type Env = {
  HYPERDRIVE?: {
    connectionString?: string;
  };
  DATABASE_URL?: string;
};

/**
 * Create a Drizzle client using either a DATABASE_URL if defined,
 * otherwise Cloudflare Hyperdrive in Workers.
 * Returns null if no connection string is found.
 */
export const createDb = (env: Env) => {
  const connectionString =
    env.DATABASE_URL ?? env?.HYPERDRIVE?.connectionString;
  if (!connectionString) {
    return null;
  }
  // The settings below are what Cloudflare Workers recommend. If not using Cloudflare, these can be modified.
  const client = postgres(connectionString, {
    // Limit the connections for the Worker request to 5 due to Workers' limits on concurrent external connections
    max: 5,
    // If you are not using array types in your Postgres schema, disable `fetch_types` to avoid an additional round-trip (unnecessary latency)
    fetch_types: false,
  });
  return drizzle(client, { casing: "snake_case" });
};
