#!/usr/bin/env bun

/**
 * Standalone script to bootstrap and organization by creating an organization and adding an existing user as owner member.
 *
 * SETUP: Ensure you set the envs either in api/.env or in the mock below, and run from api/ folder.
 *
 * IMPORTANT NOTES:
 *
 * - The specified USER MUST ALREADY EXIST in the database, otherwise the membership fails (Org will still be created)
 * - There is no "invite" sent, this script works with the db itself and bypasses the better-auth server and API key.
 * - The default role is "owner" but you can also specify "admin" or "member" instead. However it is generally better
 *   for the seeded owner to subsequently invite admins or members through the app interface instead of this script.
 * - The owner can then log in and perform additional actions in the app.
 * - If the org with the same name/stub already exists, it will be used.
 *
 * USAGE: bun run scripts/create-org-add-owner.ts "Organization Name" "owner@example.com" "admin"
 *
 */

import { getAuth } from "../src/auth";

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error(
    "Usage: bun run scripts/create-org-add-owner.ts <organization-name> <owner-email> [role-default=owner]",
  );
  process.exit(1);
}

const [orgName, adminEmail, roleName = "owner"] = args;

// Create a mock env object with required properties
const env = {
  DATABASE_URL: process.env.DATABASE_URL, // REQUIRED
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "fallback-secret-key",
  API_URL: process.env.API_URL || "http://localhost:3001",
};

const auth = getAuth(env);

/**
 * Universal seeding functions using Better Auth's internalAdapter.
 * This bypasses HTTP/auth layers and works directly with the database.
 */
type Org = {
  name: string;
  slug: string;
};
type User = {
  email: string;
  password: string;
  name: string;
  emailVerified?: boolean;
};
const roles = ["owner", "admin", "member"];

type MemberRole = (typeof roles)[number];

type SeedAction = "found" | "created" | "updated";

type SeedResult<T> = {
  id: T;
  action: SeedAction;
};

/**
 * Seed an organization.
 * @returns Org ID and action (created or found)
 */
async function seedOrg(org: Org): Promise<SeedResult<string>> {
  const context = await auth.$context;
  const adapter = context.adapter;

  const existing = await adapter.findOne<{ id: string }>({
    model: "organization",
    where: [{ field: "slug", value: org.slug }],
  });

  if (existing) {
    return { id: existing.id, action: "found" };
  }

  const orgEntity = await adapter.create({
    model: "organization",
    data: {
      name: org.name,
      slug: org.slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return { id: orgEntity.id, action: "created" };
}

/**
 * Seed a user with email/password credentials.
 * @returns User ID and action (created or found)
 */
export async function seedUser(user: User): Promise<SeedResult<string>> {
  const context = await auth.$context;
  const internalAdapter = context.internalAdapter;
  const passwordUtil = context.password;

  const existingUser = await internalAdapter.findUserByEmail(user.email);

  if (existingUser) {
    return { id: existingUser.user.id, action: "found" };
  }

  const userEntity = await internalAdapter.createUser({
    email: user.email,
    emailVerified: user.emailVerified ?? true,
    name: user.name,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const hashedPassword = await passwordUtil.hash(user.password);
  await internalAdapter.linkAccount({
    accountId: crypto.randomUUID(),
    providerId: "credential",
    password: hashedPassword,
    userId: userEntity.id,
  });

  return { id: userEntity.id, action: "created" };
}

/**
 * Get an existing user by email.
 * @returns User (or null if not found)
 */
export async function getUser(email: string) {
  const context = await auth.$context;
  const internalAdapter = context.internalAdapter;

  const existingUser = await internalAdapter.findUserByEmail(email);

  return existingUser?.user;
}

/**
 * Seed a user membership to an org with a specific role.
 * @returns Action (created or found)
 */
export async function seedUserToOrg(
  userId: string,
  orgId: string,
  role: MemberRole,
): Promise<SeedResult<void>> {
  const context = await auth.$context;
  const adapter = context.adapter;

  const existingMember = await adapter.findOne<{ id: string }>({
    model: "member",
    where: [
      { field: "userId", value: userId },
      { field: "organizationId", value: orgId },
    ],
  });

  if (existingMember) {
    return { id: undefined, action: "found" };
  }

  await adapter.create({
    model: "member",
    data: {
      organizationId: orgId,
      userId: userId,
      role: role,
      createdAt: new Date(),
    },
  });

  return { id: undefined, action: "created" };
}

async function main() {
  try {
    if (!roles.includes(roleName)) {
      throw new Error(
        `Invalid role name "${roleName}".  Please specify one of: ${roles.join(", ")}`,
      );
    }
    const slug = orgName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    console.log(`Creating org: ${orgName} (${slug})`);
    console.log(`Adding ${roleName}: ${adminEmail}\n`);

    const org = await seedOrg({
      name: orgName,
      slug,
    });
    console.log("🏛️  Organization:", org);

    const existingUser = await getUser(adminEmail);

    if (!existingUser) {
      throw new Error(
        `User with email ${adminEmail} was not found. They must sign up to the app then re-run this script to make them the org owner`,
      );
    }
    console.log("👤  User Exists:", { ...existingUser, image: "<redacted>" });

    const membershipResult = await seedUserToOrg(
      existingUser.id,
      org.id,
      "owner",
    );
    console.log("🪪  Membership:", membershipResult);

    console.log(
      `\n✅ Success! Organization ${org.action} and ${roleName} membership ${membershipResult.action}.\n`,
    );

    process.exit(0);
  } catch (error: any) {
    console.error("❌", error);
    process.exit(1);
  }
}

// Run the script
main()
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  })
  .finally(() => {
    // Clean up auth?
  });
