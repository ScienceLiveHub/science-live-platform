import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./user";

/*
 * Organization Schema
 *
 * This schema supports multi-tenant organizations with teams,
 * member management, invitations, and role-based permissions.
 */

export const organization = pgTable("organization", {
  id: text().primaryKey(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  logo: text(),
  metadata: text(), // JSON string for flexible metadata
  createdAt: timestamp().notNull(),
});

export const member = pgTable("member", {
  id: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text()
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  role: text().notNull(), // e.g., 'owner', 'admin', 'member'
  createdAt: timestamp().notNull(),
});

export const invitation = pgTable("invitation", {
  id: text().primaryKey(),
  email: text().notNull(),
  inviterId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text()
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  role: text().notNull(), // e.g., 'admin', 'member'
  status: text().notNull().default("pending"), // 'pending', 'accepted', 'rejected', 'expired'
  createdAt: timestamp().notNull(),
  expiresAt: timestamp().notNull(),
  teamId: text(), // Optional: for team-specific invitations
});

// Note: this table is not currently used, as role is defined in the member table
// To enable use of this table for dynamic setting of roles see:
// https://www.better-auth.com/docs/plugins/organization#dynamic-access-control
export const organizationRole = pgTable("organizationRole", {
  id: text().primaryKey(),
  organizationId: text()
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  role: text().notNull(), // e.g., 'owner', 'admin', 'member'
  permission: text().notNull(),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
});

export const organizationSchema = {
  organization,
  member,
  invitation,
  organizationRole,
};
