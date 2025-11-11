import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthEndpoint, openAPI } from "better-auth/plugins";
import { createDb } from "../db";
import * as authSchema from "../db/schema/user_auth";
import { customProviders } from "./custom-providers";
import { builtInProviders } from "./built-in-providers";

type Env = {
  ALLOWED_ORIGINS?: string;
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_SECRET?: string;
  HYPERDRIVE?: { connectionString?: string };
  // Provider credentials come in as top-level env vars
  [key: string]: unknown;
};

/**
 * Better-Auth Plugin that returns the list of available social providers
 */
export const getSocialProviders = () => ({
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
        ctx.json(ctx.context.socialProviders?.map((p) => p.name.toLowerCase()))
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
    socialProviders: builtInProviders(env),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    plugins: [openAPI(), customProviders(env), getSocialProviders()],
    trustedOrigins: (typeof env.ALLOWED_ORIGINS === "string"
      ? env.ALLOWED_ORIGINS
      : ""
    )
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean),
    database: drizzleAdapter(db as any, {
      provider: "pg",
      schema: authSchema,
    }),
  });
};
