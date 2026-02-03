import { InferSelectModel } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/*
 * User and Auth Schema
 *
 * Most of these fields are required by better-auth https://www.better-auth.com/docs/concepts/database#core-schema
 * It is fine to add more fields here where required but avoid modifying the existing ones,
 * and mark any extras as `optional`
 */

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull(),
  image: text(),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
  isAnonymous: boolean().default(false), // optional
});

export const session = pgTable("session", {
  id: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text().notNull().unique(),
  expiresAt: timestamp().notNull(),
  ipAddress: text(),
  userAgent: text(),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
  activeOrganizationId: text(), // Active organization context
  activeTeamId: text(), // Active team context
});

export const account = pgTable("account", {
  id: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text().notNull(),
  providerId: text().notNull(),
  accessToken: text(),
  refreshToken: text(),
  accessTokenExpiresAt: timestamp(),
  refreshTokenExpiresAt: timestamp(),
  scope: text(),
  idToken: text(),
  password: text(),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
});

export const verification = pgTable("verification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp(),
  updatedAt: timestamp(),
});

export const notification = pgTable("notification", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: text().notNull().default("info"), // e.g., 'invite', 'message', 'info', 'warning', 'error' etc
  title: text().notNull(),
  link: text(), // if specified, clicking on title will open this link (preferentially)
  content: text(), // if specified, clicking on title will show this additional content (markdown supported)
  isDismissed: boolean().default(false),
  expiresAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const schema = { user, session, account, verification, notification };

export type User = InferSelectModel<typeof user>;
export type Session = InferSelectModel<typeof session>;
export type Notification = InferSelectModel<typeof notification>;
