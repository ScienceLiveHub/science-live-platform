import { Session, User } from "better-auth";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "./db";
import { notification } from "./db/schema/user";
import { NotificationType } from "./utils";

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
  data: {
    title: string;
    type?: NotificationType;
    link?: string;
    content?: string;
    expiresAt?: Date;
  },
) {
  const db = createDb(env);

  if (!db) {
    return null;
  }

  try {
    const result = await db
      .insert(notification)
      .values({
        userId,
        type: data.type ?? "info",
        title: data.title,
        link: data.link,
        content: data.content,
        expiresAt: data.expiresAt,
      })
      .returning();

    return result[0] ?? null;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

// Get all notifications for the current authenticated user
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

    // Fetch notifications for the user
    const notifications = await db
      .select({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        link: notification.link,
        content: notification.content,
        createdAt: notification.createdAt,
      })
      .from(notification)
      .where(eq(notification.userId, user.id))
      .orderBy(desc(notification.createdAt));

    return c.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get unread (non-dismissed) notifications for the current authenticated user
app.get("/unread", async (c) => {
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
        title: notification.title,
        link: notification.link,
        content: notification.content,
        isDismissed: notification.isDismissed,
        expiresAt: notification.expiresAt,
        createdAt: notification.createdAt,
      })
      .from(notification)
      .where(eq(notification.userId, user.id))
      .orderBy(desc(notification.createdAt));

    // Filter out dismissed and expired notifications in code
    const now = new Date();
    const unreadNotifications = notifications.filter(
      (n) => !n.isDismissed && (!n.expiresAt || new Date(n.expiresAt) > now),
    );

    return c.json(unreadNotifications);
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

    // Update the notification to dismissed
    const result = await db
      .update(notification)
      .set({ isDismissed: true })
      .where(
        and(
          eq(notification.id, notificationId),
          eq(notification.userId, user.id),
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

    // Update all user's notifications to dismissed
    await db
      .update(notification)
      .set({ isDismissed: true })
      .where(eq(notification.userId, user.id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error dismissing all notifications:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
