import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  createAuthEndpoint,
  createAuthMiddleware,
  openAPI,
} from "better-auth/plugins";
import { createDb } from "../db";
import * as authSchema from "../db/schema/user_auth";
import { customProviders } from "./custom-providers";
import { builtInProviders } from "./built-in-providers";

type Env = {
  API_URL?: string;
  FRONTEND_URL?: string;
  ALLOWED_ORIGINS?: string;
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

export const formatAllowedOrigins = (env: any) => {
  const allowed = (
    typeof env.ALLOWED_ORIGINS === "string"
      ? (env.ALLOWED_ORIGINS as string)
      : ""
  )
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  if (typeof env.FRONTEND_URL === "string") {
    allowed.push(env.FRONTEND_URL);
  }
  return allowed;
};

/**
 * Factory to create the Better Auth instance using Workers bindings.
 */
export const getAuth = (env: Env) => {
  const db = createDb(env);
  return betterAuth({
    baseURL: typeof env.API_URL === "string" ? env.API_URL : undefined,
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
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    plugins: [openAPI(), customProviders(env), getSocialProviders()],
    account: {
      accountLinking: {
        // TODO: consider always requiring explicit login to link OIDC accounts if `allowDifferentEmails: true`.
        // That would mitigate the potential for account takeover as suggested in the Better Auth docs, even though it is slightly inconvenient for the user.
        // This can be done by setting the custom providers config `prompt: "login"`.
        allowDifferentEmails: true,
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        //TODO: can we append the partial relative redirect URL to the FRONTEND_URL so it goes back to the same page?
        ctx.redirect(env.FRONTEND_URL ?? "/");
      }),
    },
    trustedOrigins: formatAllowedOrigins(env),
    database: drizzleAdapter(db as any, {
      provider: "pg",
      schema: authSchema,
    }),
  });
};
