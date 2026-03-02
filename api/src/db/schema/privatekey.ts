import { text } from "drizzle-orm/pg-core";

/**
 * Encryption utilities using the Web Crypto API (crypto.subtle).
 *
 * Compatible with Cloudflare Workers, Node.js 20+, and all modern runtimes
 * that implement the Web Crypto API.
 *
 * Uses AES-256-GCM with a pre-computed 256-bit key.
 * The ENCRYPTION_KEY env var must be a 32-byte key encoded as base64 (44 chars).
 * Generate one with: openssl rand -base64 32
 *
 * The encrypted output format is: base64(iv + ciphertext + authTag)
 * where iv is 12 bytes and the rest is ciphertext with the 16-byte GCM auth tag.
 *
 * IMPORTANT: Because crypto.subtle is async, these functions cannot be used
 * inside Drizzle's synchronous fromDriver/toDriver callbacks. Instead, call
 * encrypt/decrypt explicitly in your route handlers where you have access
 * to the Cloudflare Worker env bindings (e.g. c.env.ENCRYPTION_KEY).
 */

const IV_LENGTH = 12;

/**
 * Imports a base64-encoded 256-bit key as an AES-GCM CryptoKey.
 *
 * The key is cached per unique base64 string to avoid repeated importKey calls.
 */
const keyCache = new Map<string, Promise<CryptoKey>>();

function importKey(base64Key: string): Promise<CryptoKey> {
  let cached = keyCache.get(base64Key);
  if (cached) return cached;

  const keyBytes = fromBase64(base64Key);
  if (keyBytes.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 32 bytes (256 bits) encoded as base64. Got ${keyBytes.length} bytes. Generate one with: openssl rand -base64 32`,
    );
  }

  cached = crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  keyCache.set(base64Key, cached);
  return cached;
}

/**
 * Converts a Uint8Array to a base64 string.
 */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a base64 string to a Uint8Array.
 */
function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a pre-computed key.
 *
 * A random 12-byte IV is generated per call, ensuring that encrypting the
 * same plaintext twice produces different ciphertext.
 *
 * @param plaintext  - The string to encrypt
 * @param base64Key  - The 256-bit encryption key as base64 (e.g. env.ENCRYPTION_KEY)
 * @returns A base64-encoded string containing iv + ciphertext + authTag
 *
 * @example
 * const encrypted = await encrypt(privateKey, c.env.ENCRYPTION_KEY);
 * // Store `encrypted` in the database text column
 */
export async function encrypt(
  plaintext: string,
  base64Key: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await importKey(base64Key);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    encoder.encode(plaintext).buffer as ArrayBuffer,
  );

  // Combine iv + ciphertext into a single buffer
  const cipherBytes = new Uint8Array(cipherBuffer);
  const combined = new Uint8Array(IV_LENGTH + cipherBytes.length);
  combined.set(iv, 0);
  combined.set(cipherBytes, IV_LENGTH);

  return toBase64(combined);
}

/**
 * Decrypts a base64-encoded ciphertext string that was produced by {@link encrypt}.
 *
 * @param encoded    - The base64 string from the database (iv + ciphertext + authTag)
 * @param base64Key  - The same 256-bit encryption key as base64 used during encryption
 * @returns The original plaintext string
 * @throws Will throw if the key is wrong or the data has been tampered with
 *
 * @example
 * const privateKey = await decrypt(row.key, c.env.ENCRYPTION_KEY);
 */
export async function decrypt(
  encoded: string,
  base64Key: string,
): Promise<string> {
  const combined = fromBase64(encoded);

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const key = await importKey(base64Key);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer,
  );

  return new TextDecoder().decode(plainBuffer);
}

/**
 * Drizzle column helper that creates a plain text column for storing encrypted data.
 *
 * This does NOT auto-encrypt/decrypt in the Drizzle column callbacks because
 * crypto.subtle is async and Drizzle's fromDriver/toDriver are synchronous.
 *
 * You must call {@link encrypt} before inserting and {@link decrypt} after selecting,
 * passing the encryption key from the Cloudflare Worker env bindings.
 *
 * @example
 * // In your schema:
 * key: encryptedText("key"),
 *
 * // In your route handler (where c.env is available):
 * const encrypted = await encrypt(plainKey, c.env.ENCRYPTION_KEY);
 * await db.insert(signingKey).values({ key: encrypted, ... });
 *
 * // When reading:
 * const row = await db.select().from(signingKey).where(...);
 * const plainKey = await decrypt(row.key, c.env.ENCRYPTION_KEY);
 */
export function encryptedText(name?: string) {
  return name ? text(name) : text();
}

/**
 * Helper function to manually decrypt an encrypted value.
 *
 * @param encryptedValue - The encrypted base64 string from the database
 * @param base64Key      - The 256-bit encryption key as base64 (e.g. env.ENCRYPTION_KEY)
 * @returns The decrypted plaintext, or null if the input is falsy
 *
 * @example
 * const row = await fetchRow(id);
 * const value = await decryptValue(row.my_secure_column, c.env.ENCRYPTION_KEY);
 */
export async function decryptValue(
  encryptedValue: string | null | undefined,
  base64Key: string,
): Promise<string | null> {
  if (!encryptedValue) return null;
  return decrypt(encryptedValue, base64Key);
}
