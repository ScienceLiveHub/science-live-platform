import { Session, User } from "better-auth";
import { and, desc, eq, gt, isNull, ne, or } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "./db";
import { invitation, organization } from "./db/schema/organization";
import { NewNotification, notification } from "./db/schema/user";

const app = new Hono<{
  Bindings: Env;
  Variables: {
    user: User | null;
    session: Session | null;
  };
}>();

/**
 * Create a new notification for a user
 * @param env - Cloudflare environment with DB binding
 * @param userId - The user ID to create the notification for
 * @param data - Notification data (title, type, link, content, expiresAt)
 * @returns The created notification or null if creation failed
 */
export async function createNotification(
  env: Env,
  userId: string,
  data: Omit<NewNotification, "id" | "userId" | "status" | "createdAt">,
  persistent?: boolean,
) {
  const db = createDb(env);

  if (!db) {
    return null;
  }

  try {
    const result = await db
      .insert(notification)
      .values({
        ...data,
        userId,
        status: persistent ? "persistent" : "unread",
        type: data.type ?? "info",
      })
      .returning();

    return result[0] ?? null;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

// Get non-dismissed notifications for the current authenticated user
app.get("/", async (c) => {
  const db = createDb(c.env);

  if (!db) {
    return c.json({ error: "Database connection failed" }, 500);
  }

  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Fetch unread notifications for the user
    const notifications = await db
      .select({
        id: notification.id,
        type: notification.type,
        group: notification.group,
        title: notification.title,
        link: notification.link,
        content: notification.content,
        status: notification.status,
        expiresAt: notification.expiresAt,
        createdAt: notification.createdAt,
      })
      .from(notification)
      .where(
        and(
          eq(notification.userId, user.id),
          ne(notification.status, "dismissed"),
          or(
            isNull(notification.expiresAt),
            gt(notification.expiresAt, new Date()),
          ),
        ),
      )
      .orderBy(desc(notification.createdAt));

    // Insert org invitations as persistent notifications, at top
    const invitations = await db
      ?.select({
        id: invitation.id,
        organizationId: invitation.organizationId,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        organizationName: organization.name,
      })
      .from(invitation)
      .leftJoin(organization, eq(invitation.organizationId, organization.id))
      .where(
        and(eq(invitation.email, user.email), eq(invitation.status, "pending")),
      );

    if (invitations?.length > 0) {
      for (const inv of invitations) {
        notifications.unshift({
          id: `${inv.id}-invite`,
          type: "invite",
          title: `Invitation to join ${inv.organizationName + (inv.role !== "member" ? ` as ${inv.role}` : "")}`,
          group: `${inv.organizationId}-invite`,
          link: `${c.env.FRONTEND_URL}/auth/accept-invitation?invitationId=${inv.id}`,
          content: "Click to view invite",
          status: "persistent",
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
        });
      }
    }

    // Insert email verification as persistent notification, as topmost/important
    if (!user.emailVerified) {
      notifications.unshift({
        id: `${user.id}-verify`,
        type: "warning",
        title: "Check your email for verification",
        group: `verify-email`,
        link: `${c.env.FRONTEND_URL}/account/settings`,
        content:
          "If you didn't receive a verification email, click to open settings and correct it.",
        status: "persistent",
        expiresAt: null,
        createdAt: user.createdAt,
      });
    }

    return c.json(notifications);
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Dismiss a notification
app.patch("/:notificationId/dismiss", async (c) => {
  const { notificationId } = c.req.param();
  const db = createDb(c.env);

  if (!db) {
    return c.json({ error: "Database connection failed" }, 500);
  }

  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Update the notification to dismissed (only if not persistent)
    const result = await db
      .update(notification)
      .set({ status: "dismissed" })
      .where(
        and(
          eq(notification.id, notificationId),
          eq(notification.userId, user.id),
          // Only dismiss if status is not persistent
          ne(notification.status, "persistent"),
        ),
      );

    if (result.count) {
      return c.json({ success: true });
    } else {
      return c.json({ error: "Notification not found" }, 404);
    }
  } catch (error) {
    console.error("Error dismissing notification:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Dismiss all notifications for the user
app.patch("/dismiss-all", async (c) => {
  const db = createDb(c.env);

  if (!db) {
    return c.json({ error: "Database connection failed" }, 500);
  }

  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Update all user's notifications to dismissed (only non-persistent)
    await db
      .update(notification)
      .set({ status: "dismissed" })
      .where(
        and(
          eq(notification.userId, user.id),
          ne(notification.status, "persistent"),
        ),
      );

    return c.json({ success: true });
  } catch (error) {
    console.error("Error dismissing all notifications:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Read all notifications for the user
app.patch("/read-all", async (c) => {
  const db = createDb(c.env);

  if (!db) {
    return c.json({ error: "Database connection failed" }, 500);
  }

  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Update all user's notifications to read (only non-persistent)
    await db
      .update(notification)
      .set({ status: "read" })
      .where(
        and(
          eq(notification.userId, user.id),
          eq(notification.status, "unread"),
        ),
      );

    return c.json({ success: true });
  } catch (error) {
    console.error("Error reading all notifications:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
