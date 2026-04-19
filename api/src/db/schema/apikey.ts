import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/*
 * API Key Schema
 *
 * This schema supports the better-auth API key plugin.
 * https://www.better-auth.com/docs/plugins/api-key#schema
 */

export const apikey = pgTable("apikey", {
  id: text().primaryKey(),
  configId: text().notNull().default("default"), // Determines the type of owner (user/org) based on apiKey plugin config
  name: text(),
  start: text(),
  prefix: text(),
  key: text().notNull().unique(), // Hashed key
  referenceId: text().notNull(), // Can reference either a user.id OR organization.id as owner, depending on config
  refillInterval: integer(), // Interval to refill in milliseconds
  refillAmount: integer(), // Amount to refill the remaining count
  lastRefillAt: timestamp(),
  enabled: boolean().notNull().default(true),
  rateLimitEnabled: boolean().notNull().default(false), // Whether rate limiting is enabled
  rateLimitTimeWindow: integer(), // Rate limit time window in milliseconds
  rateLimitMax: integer(), // Maximum requests within the window
  requestCount: integer().notNull().default(0), // Total request count
  remaining: integer(), // Remaining number of requests
  lastRequest: timestamp(),
  expiresAt: timestamp(), // When the key expires
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
  permissions: text(), // JSON string for permissions (Record<string, string[]>)
  metadata: text(), // JSON string for flexible metadata - TODO: should it be object or jsonb?
});

export const apikeySchema = {
  apikey,
};
