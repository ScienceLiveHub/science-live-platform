import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthEndpoint, openAPI } from "better-auth/plugins";
import { createDb } from "./db";
import * as authSchema from "./db/schema/user_auth";

type Env = {
  ALLOWED_ORIGINS?: string;
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_SECRET?: string;
  HYPERDRIVE?: { connectionString?: string };
  // Provider credentials come in as top-level env vars
  [key: string]: unknown;
};

const providers = [
  "apple",
  "discord",
  "dropbox",
  "facebook",
  "github",
  "gitlab",
  "google",
  "linkedin",
  "microsoft",
  "reddit",
  "roblox",
  "spotify",
  "tiktok",
  "twitch",
  "vk",
  "zoom",
  "x",
] as const;

type ProviderConfig = {
  clientId: string;
  clientSecret: string;
  appBundleIdentifier?: string;
  tenantId?: string;
  requireSelectAccount?: boolean;
  clientKey?: string;
  issuer?: string;
};

const configuredProvidersFromEnv = (env: Env) =>
  providers.reduce<Record<string, ProviderConfig>>((acc, provider) => {
    const U = provider.toUpperCase();
    const id = env[`${U}_CLIENT_ID`];
    const secret = env[`${U}_CLIENT_SECRET`];
    if (typeof id === "string" && id && typeof secret === "string" && secret) {
      acc[provider] = { clientId: id, clientSecret: secret };
    }
    if (provider === "apple" && acc[provider]) {
      const bundleId = env[`${U}_APP_BUNDLE_IDENTIFIER`];
      if (typeof bundleId === "string" && bundleId) {
        acc[provider].appBundleIdentifier = bundleId;
      }
    }
    if (provider === "gitlab" && acc[provider]) {
      const issuer = env[`${U}_ISSUER`];
      if (typeof issuer === "string" && issuer) {
        acc[provider].issuer = issuer;
      }
    }
    if (provider === "microsoft" && acc[provider]) {
      acc[provider].tenantId = "common";
      acc[provider].requireSelectAccount = true;
    }
    if (provider === "tiktok" && acc[provider]) {
      const key = env[`${U}_CLIENT_KEY`];
      if (typeof key === "string" && key) {
        acc[provider].clientKey = key;
      }
    }
    return acc;
  }, {});

/**
 * Better-Auth Plugin that returns the list of available social providers
 */
export const socialProviders = () => ({
  id: "social-providers-plugin",
  endpoints: {
    getSocialProviders: createAuthEndpoint(
      "/social-providers",
      {
        method: "GET",
        metadata: {
          openapi: {
            description: "Returns the list of available social providers",
            responses: {
              200: {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of available social providers",
                    },
                  },
                },
              },
            },
          },
        },
      },
      async (ctx) =>
        ctx.json(ctx.context.socialProviders.map((p) => p.name.toLowerCase()))
    ),
  },
});

/**
 * Factory to create the Better Auth instance using Workers bindings.
 */
export const getAuth = (env: Env) => {
  const db = createDb(env);
  return betterAuth({
    baseURL:
      typeof env.BETTER_AUTH_URL === "string" ? env.BETTER_AUTH_URL : undefined,
    secret:
      typeof env.BETTER_AUTH_SECRET === "string"
        ? env.BETTER_AUTH_SECRET
        : undefined,
    socialProviders: configuredProvidersFromEnv(env),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    plugins: [openAPI(), socialProviders()],
    trustedOrigins: (typeof env.ALLOWED_ORIGINS === "string"
      ? env.ALLOWED_ORIGINS
      : ""
    )
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean),
    // Drizzle adapter expects a database; ensure Hyperdrive is configured.
    database: drizzleAdapter(db as any, {
      provider: "pg",
      schema: authSchema,
    }),
  });
};
