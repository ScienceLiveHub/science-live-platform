import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  createAuthEndpoint,
  createAuthMiddleware,
  openAPI,
} from "better-auth/plugins";
import { createDb } from "@/db";
import * as authSchema from "@/db/schema/user_auth";
import { customProviders } from "./custom-providers";
import { builtInProviders } from "./built-in-providers";
import { sendEmail } from "@/email";

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
    baseURL:
      typeof env.API_URL === "string" ? env.API_URL + "/auth" : undefined,
    secret:
      typeof env.BETTER_AUTH_SECRET === "string"
        ? env.BETTER_AUTH_SECRET
        : undefined,
    socialProviders: builtInProviders(env),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
      autoSignInAfterVerification: true,
      async afterEmailVerification(user: any, request: any) {
        // TODO: currently there is no feedback for successful email verification, it just redirects the frontend to home.
        // Perhaps send an email or redirect to the /email-verified page
        console.log(`${user.email} has been successfully verified!`);
      },
      sendResetPassword: async ({ user, url, token }, request) => {
        // TODO: consider using an email template https://better-auth-ui.com/components/email-template
        await sendEmail(env, {
          to: user.email,
          subject: "Reset your password",
          html: `Click the link to reset your Science Live Platform password: ${url}`,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url, token }, request) => {
        // TODO: consider using an email template https://better-auth-ui.com/components/email-template
        await sendEmail(env, {
          to: user.email,
          subject: "Verify your email address",
          html: `Click the link to verify your Science Live Platform email: ${url}`,
        });
      },
    },
    user: {
      changeEmail: {
        enabled: true,
        sendChangeEmailVerification: async (
          { user, newEmail, url, token },
          request
        ) => {
          // TODO: consider using an email template https://better-auth-ui.com/components/email-template
          await sendEmail(env, {
            to: newEmail,
            subject: "Confirm your change of email address",
            html: `Click the link to confirm your new Science Live Platform email: ${url}`,
          });
        },
      },
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
