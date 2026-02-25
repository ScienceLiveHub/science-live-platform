import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { wrapKeyPEM } from "../../frontend/src/lib/string-format";
import { createDb } from "./db";
import { decryptValue, encrypt } from "./db/schema/privatekey";
import { account, signingKey, user } from "./db/schema/user";

const app = new Hono<{
  Bindings: Env;
  Variables: {
    user: { id: string } | null;
    session: unknown | null;
  };
}>();

// Get current user's signing profile
app.get("/profile", async (c) => {
  const currentUser = c.get("user");

  if (!currentUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDb(c.env);

  if (!db) {
    return c.json({ error: "Database connection failed" }, 500);
  }

  try {
    // Fetch user data
    const userData = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, currentUser.id))
      .limit(1);

    if (userData.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

    // Fetch ORCID account if exists
    const orcidAccount = await db
      .select({ accountId: account.accountId })
      .from(account)
      .where(
        and(
          eq(account.userId, currentUser.id),
          eq(account.providerId, "orcid"),
        ),
      )
      .limit(1);

    // This will be an ORCID URL
    const orcid = orcidAccount[0]?.accountId ?? null;

    // Fetch default signing key if exists
    const defaultSigningKey = await db
      .select({ name: signingKey.name, key: signingKey.encryptedKey })
      .from(signingKey)
      .where(
        and(
          eq(signingKey.userId, currentUser.id),
          eq(signingKey.isDefault, true),
        ),
      )
      .limit(1);

    // Decrypt the signing key if it exists (stored encrypted in the database)
    const decryptedKey = await decryptValue(
      defaultSigningKey[0]?.key,
      c.env.ENCRYPTION_KEY,
    );

    const userProfile = {
      name: userData[0].name,
      orcid: orcid ?? null,
      privateKey: decryptedKey,
      keyInfo: defaultSigningKey[0]?.name,
    };

    return c.json(userProfile);
  } catch (error) {
    console.error("Error fetching signing profile:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get all keys for user, excluding the actual encrypted value, ordered by oldest created first
app.get("/key/list", async (c) => {
  const currentUser = c.get("user");

  if (!currentUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDb(c.env);
  if (!db) {
    return c.json({ error: "Database connection failed" }, 500);
  }

  try {
    const keys = await db
      .select({
        id: signingKey.id,
        name: signingKey.name,
        isDefault: signingKey.isDefault,
        createdAt: signingKey.createdAt,
      })
      .from(signingKey)
      .where(eq(signingKey.userId, currentUser.id))
      .orderBy(signingKey.createdAt);

    return c.json({ keys });
  } catch (error) {
    console.error("Error listing signing keys:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Helper function to generate a new RSA private key and return base64 encoded string
export async function generatePrivateKey(): Promise<string> {
  // Generate a 4096-bit RSA key pair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: "SHA-512",
    },
    true,
    ["sign", "verify"],
  );

  // Export the private key in PKCS8 format
  const privateKeyBuffer = await crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey,
  );

  // Convert to base64 string
  const base64Key = btoa(
    String.fromCharCode(...new Uint8Array(privateKeyBuffer)),
  );

  return base64Key;
}

async function validateKey(privateKey: string) {
  try {
    // Validate that the key is a valid PEM RSA PKCS8 key
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";

    const cleanKey = privateKey.trim();

    if (!cleanKey.startsWith(pemHeader) || !cleanKey.endsWith(pemFooter)) {
      throw new Error(
        "Invalid PEM format: Must start with -----BEGIN PRIVATE KEY-----",
      );
    }

    // Extract the base64 content
    const base64Content = cleanKey
      .replace(pemHeader, "")
      .replace(pemFooter, "")
      .replace(/\s/g, "");

    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Try to import the key to verify it's a valid RSA key
    await crypto.subtle.importKey(
      "pkcs8",
      bytes.buffer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-512", // TODO: should we support otheers e.g. SHA-256?
      },
      true,
      ["sign"],
    );
  } catch {
    return false;
  }

  return true;
}

// Add a new signing key for the authenticated user
// The key can be specified or generated
app.post("/key", async (c) => {
  const currentUser = c.get("user");

  if (!currentUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDb(c.env);
  if (!db) {
    return c.json({ error: "Database connection failed" }, 500);
  }

  try {
    const body = await c.req.json();
    const { name, privateKey, isDefault, generateKey } = body as {
      name?: string;
      privateKey?: string;
      isDefault?: boolean;
      generateKey?: boolean;
    };

    let keyToStore: string;

    if (generateKey) {
      // Generate a new RSA key in PEM format
      keyToStore = wrapKeyPEM(await generatePrivateKey());
    } else if (privateKey) {
      // Validate the provided key
      if (await validateKey(privateKey)) {
        keyToStore = privateKey;
      } else {
        return c.json(
          {
            error:
              "Invalid private key format. Must be a valid PEM encoded RSA PKCS8 key.",
          },
          400,
        );
      }
    } else {
      return c.json(
        { error: "Private key is required or generateKey must be true" },
        400,
      );
    }

    // Encrypt the private key before storing
    const encryptedKeyValue = await encrypt(keyToStore, c.env.ENCRYPTION_KEY);

    // If this key is being set as default, remove default from other keys
    if (isDefault) {
      await db
        .update(signingKey)
        .set({ isDefault: false })
        .where(eq(signingKey.userId, currentUser.id));
    }

    // Check if user has any existing keys
    const existingKeys = await db
      .select({ id: signingKey.id })
      .from(signingKey)
      .where(eq(signingKey.userId, currentUser.id));

    // Make this the default if it's the first key or explicitly requested
    const shouldBeDefault = isDefault || existingKeys.length === 0;

    const [newKey] = await db
      .insert(signingKey)
      .values({
        userId: currentUser.id,
        name: name ?? null,
        encryptedKey: encryptedKeyValue,
        isDefault: shouldBeDefault,
      })
      .returning();

    return c.json(
      {
        id: newKey.id,
        name: newKey.name,
        isDefault: newKey.isDefault,
        createdAt: newKey.createdAt,
      },
      201,
    );
  } catch (error) {
    console.error("Error adding signing key:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Delete a signing key for the authenticated user
app.delete("/key/:id", async (c) => {
  const currentUser = c.get("user");

  if (!currentUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDb(c.env);
  if (!db) {
    return c.json({ error: "Database connection failed" }, 500);
  }

  try {
    const { id } = c.req.param();

    if (!id) {
      return c.json({ error: "Key ID is required" }, 400);
    }

    // Verify the key belongs to the current user
    const existingKey = await db
      .select({ id: signingKey.id, isDefault: signingKey.isDefault })
      .from(signingKey)
      .where(and(eq(signingKey.id, id), eq(signingKey.userId, currentUser.id)))
      .limit(1);

    if (existingKey.length === 0) {
      return c.json({ error: "Key not found" }, 404);
    }

    const wasDefault = existingKey[0].isDefault;

    // Delete the key
    await db.delete(signingKey).where(eq(signingKey.id, id));

    // If the deleted key was the default, set another key as default
    if (wasDefault) {
      const remainingKeys = await db
        .select({ id: signingKey.id })
        .from(signingKey)
        .where(eq(signingKey.userId, currentUser.id))
        .orderBy(signingKey.createdAt)
        .limit(1);

      if (remainingKeys.length > 0) {
        await db
          .update(signingKey)
          .set({ isDefault: true })
          .where(eq(signingKey.id, remainingKeys[0].id));
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting signing key:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get the decrypted signing key by ID for the user
app.get("/key/:id", async (c) => {
  const currentUser = c.get("user");

  if (!currentUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDb(c.env);
  if (!db) {
    return c.json({ error: "Database connection failed" }, 500);
  }

  try {
    const { id } = c.req.param();

    if (!id) {
      return c.json({ error: "Key ID is required" }, 400);
    }

    // Fetch signing key by ID for this user
    const key = await db
      .select({
        id: signingKey.id,
        name: signingKey.name,
        encryptedKey: signingKey.encryptedKey,
        isDefault: signingKey.isDefault,
        createdAt: signingKey.createdAt,
      })
      .from(signingKey)
      .where(and(eq(signingKey.id, id), eq(signingKey.userId, currentUser.id)))
      .limit(1);

    if (key.length === 0) {
      return c.json({ error: "Key not found" }, 404);
    }

    // Decrypt the signing key
    const decryptedKey = await decryptValue(
      key[0].encryptedKey,
      c.env.ENCRYPTION_KEY,
    );

    return c.json({
      id: key[0].id,
      name: key[0].name,
      privateKey: decryptedKey,
      isDefault: key[0].isDefault,
      createdAt: key[0].createdAt,
    });
  } catch (error) {
    console.error("Error fetching signing key:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Update the name and/or default status for a key (partial update)
app.patch("/key/:id", async (c) => {
  const currentUser = c.get("user");

  if (!currentUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDb(c.env);
  if (!db) {
    return c.json({ error: "Database connection failed" }, 500);
  }

  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { name, isDefault } = body as {
      name?: string;
      isDefault?: boolean;
    };

    if (!id) {
      return c.json({ error: "Key ID is required" }, 400);
    }

    // Verify the key belongs to the current user
    const existingKey = await db
      .select({ id: signingKey.id })
      .from(signingKey)
      .where(and(eq(signingKey.id, id), eq(signingKey.userId, currentUser.id)))
      .limit(1);

    if (existingKey.length === 0) {
      return c.json({ error: "Key not found" }, 404);
    }

    // If setting as default, remove default from all other keys first
    if (isDefault === true) {
      await db
        .update(signingKey)
        .set({ isDefault: false })
        .where(eq(signingKey.userId, currentUser.id));
    }

    // Build update object with only provided fields
    const updateData: { name?: string | null; isDefault?: boolean } = {};
    if (name !== undefined) {
      updateData.name = name || null;
    }
    if (isDefault !== undefined) {
      updateData.isDefault = isDefault;
    }

    // Update the key
    const [updatedKey] = await db
      .update(signingKey)
      .set(updateData)
      .where(eq(signingKey.id, id))
      .returning();

    return c.json({
      id: updatedKey.id,
      name: updatedKey.name,
      isDefault: updatedKey.isDefault,
      createdAt: updatedKey.createdAt,
    });
  } catch (error) {
    console.error("Error updating signing key:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
