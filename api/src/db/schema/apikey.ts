import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./user";

/*
 * API Key Schema
 *
 * This schema supports the better-auth API key plugin.
 * https://www.better-auth.com/docs/plugins/api-key#schema
 */

export const apikey = pgTable("apikey", {
  id: text().primaryKey(),
  name: text(),
  start: text(),
  prefix: text(),
  key: text().notNull().unique(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  refillInterval: integer(), // Interval to refill in milliseconds
  refillAmount: integer(), // Amount to refill the remaining count
  lastRefillAt: timestamp(),
  enabled: boolean().notNull().default(true),
  rateLimitEnabled: boolean().default(false), // Whether rate limiting is enabled
  rateLimitTimeWindow: integer(), // Rate limit time window in milliseconds
  rateLimitMax: integer(), // Maximum requests within the window
  requestCount: integer().default(0), // Total request count
  remaining: integer(), // Remaining number of requests
  lastRequest: timestamp(),
  expiresAt: timestamp(), // When the key expires
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
  permissions: text(), // JSON string for permissions (Record<string, string[]>)
  metadata: text(), // JSON string for flexible metadata
});

export const apikeySchema = {
  apikey,
};
