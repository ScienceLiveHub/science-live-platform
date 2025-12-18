import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization } from "./organization";
import { user } from "./user";

/*
 * Team Schema
 *
 * This schema adds teams support working with multi-tenant organizations,
 * invitations, and role-based permissions.
 */

export const team = pgTable("team", {
  id: text().primaryKey(),
  name: text().notNull(),
  organizationId: text()
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
});

export const teamMember = pgTable("teamMember", {
  id: text().primaryKey(),
  teamId: text()
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp().notNull(),
});

export const teamSchema = {
  team,
  teamMember,
};
