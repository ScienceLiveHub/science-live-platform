import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "./db";
import { member, organization } from "./db/schema/organization";
import { account, user } from "./db/schema/user";

const app = new Hono<{ Bindings: Env }>();

function normalizeOrcidInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Accept raw ORCID iD or an ORCID URL (e.g. https://orcid.org/0000-0002-1825-0097)
  const match = trimmed.match(/(\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx])/);
  if (!match) return null;

  const orcid = match[1];
  return `${orcid.slice(0, -1)}${orcid.slice(-1).toUpperCase()}`;
}

// Returns the user id for a given ORCID iD, or null if no user found.
// This is useful for turning ORCID links into internal profile links.
app.get("/orcid/:orcid", async (c) => {
  const { orcid } = c.req.param();
  const db = createDb(c.env);

  if (!db) {
    return c.json({ error: "Database connection failed" }, 500);
  }

  const orcidId = normalizeOrcidInput(orcid);
  if (!orcidId) {
    return c.json({ userId: null });
  }

  try {
    const match = await db
      .select({ userId: account.userId })
      .from(account)
      .where(
        and(
          eq(account.providerId, "orcid"),
          eq(account.accountId, "https://orcid.org/" + orcidId),
        ),
      )
      .limit(1);

    return c.json({ userId: match[0]?.userId ?? null });
  } catch (error) {
    console.error("Error looking up user by ORCID:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get public user profile by user ID
app.get("/:userId", async (c) => {
  const { userId } = c.req.param();
  const db = createDb(c.env);

  if (!db) {
    return c.json({ error: "Database connection failed" }, 500);
  }

  try {
    // Fetch user data
    const userData = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userData.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

    // Fetch ORCID account if exists
    const orcidAccount = await db
      .select({
        accountId: account.accountId,
        providerId: account.providerId,
      })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "orcid")))
      .limit(1);

    const orcidConnected = orcidAccount.length > 0;

    // Fetch organizations the user is a member of
    const userOrganizations = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        // membershipCreatedAt: member.createdAt,
        // role: member.role,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, userId));

    const userProfile = {
      id: userData[0].id,
      name: userData[0].name,
      emailVerified: userData[0].emailVerified,
      image: userData[0].image,
      createdAt: userData[0].createdAt,
      orcidConnected,
      orcidId: orcidConnected ? orcidAccount[0].accountId : null,
      organizations: userOrganizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        // membershipCreatedAt: org.membershipCreatedAt,
        // role: org.role,
      })),
    };

    return c.json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
