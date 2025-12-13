import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "./db";
import { account, user } from "./db/schema/user_auth";

const app = new Hono<{ Bindings: Env }>();

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

    const userProfile = {
      id: userData[0].id,
      name: userData[0].name,
      emailVerified: userData[0].emailVerified,
      image: userData[0].image,
      createdAt: userData[0].createdAt,
      orcidConnected: orcidAccount.length > 0,
      orcidId: orcidAccount.length > 0 ? orcidAccount[0].accountId : null,
    };

    return c.json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
