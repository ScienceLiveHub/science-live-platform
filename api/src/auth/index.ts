import { createDb } from "@/db";
import { apikeySchema } from "@/db/schema/apikey";
import { organizationSchema } from "@/db/schema/organization";
import { encrypt } from "@/db/schema/privatekey";
import * as authSchema from "@/db/schema/user";
import { signingKey } from "@/db/schema/user";
import { sendEmail } from "@/email";
import { generatePrivateKey } from "@/signing";
import { isValidEmail } from "@/utils";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  apiKey,
  createAuthEndpoint,
  createAuthMiddleware,
  openAPI,
  organization,
} from "better-auth/plugins";
import { wrapKeyPEM } from "../../../frontend/src/lib/string-format";
import { builtInProviders } from "./built-in-providers";
import { customProviders } from "./custom-providers";
import {
  changeEmailTemplate,
  orgInviteEmailTemplate,
  resetPasswordTemplate,
  verifyEmailTemplate,
} from "./email-templates";

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
        ctx.json(ctx.context.socialProviders?.map((p) => p.name.toLowerCase())),
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
    databaseHooks: {
      user: {
        create: {
          async after(user) {
            // Generate a new default signing key for the user
            const keyToStore = wrapKeyPEM(await generatePrivateKey());

            const encrypted = await encrypt(keyToStore, env.ENCRYPTION_KEY);

            // Insert the signing key for the new user
            if (db) {
              await db.insert(signingKey).values({
                userId: user.id,
                name: "Science Live Generated Key",
                encryptedKey: encrypted,
                isDefault: true,
              });
            }
          },
        },
      },
    },
    baseURL:
      typeof env.API_URL === "string" ? env.API_URL + "/auth" : undefined,
    secret:
      typeof env.BETTER_AUTH_SECRET === "string"
        ? env.BETTER_AUTH_SECRET
        : undefined,
    telemetry: {
      // Already disabled by default but explicitly set it just in case it changes in future
      enabled: false,
    },
    socialProviders: builtInProviders(env),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url, token }, request) => {
        await sendEmail(env, {
          to: user.email,
          subject: "Reset your password",
          react: resetPasswordTemplate(user.name, env.FRONTEND_URL, url),
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url, token }, request) => {
        // Never verify a placeholder or invalid email
        if (isValidEmail(user.email)) {
          await sendEmail(env, {
            to: user.email,
            subject: "Verify your email address",
            react: verifyEmailTemplate(user.name, env.FRONTEND_URL, url),
          });
        }
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path.startsWith("/verify-email") && ctx.query?.token) {
          //TODO: Cant find a built-in better-auth-ui callback which logs the user in by setting the session cookie in the frontend
          //      Might need to create our own one.  For now, redirect to our custom page.
          ctx.redirect(`${env.FRONTEND_URL}/email-verified`);
          return;
        }
        if (ctx.path.startsWith("/reset-password") && ctx.params?.token) {
          // Redirect to pw reset frontend
          ctx.redirect(
            `${env.FRONTEND_URL}/auth/reset-password?token=${ctx.params.token}`,
          );
          return;
        }
        // Catch-all redirect to frontend when an api endpoint is hit directly in a browser
        // e.g. callback after authentication with OIDC provider sign-in
        ctx.redirect(
          `${env.FRONTEND_URL}${ctx.query?.callbackURL ? ctx.query?.callbackURL : "/"}`,
        );
      }),
    },
    user: {
      changeEmail: {
        enabled: true,
        sendChangeEmailVerification: async (
          { user, newEmail, url, token },
          request,
        ) => {
          await sendEmail(env, {
            to: newEmail,
            subject: "Confirm your change of email address",
            react: changeEmailTemplate(user.name, env.FRONTEND_URL, url),
          });
        },
      },
      deleteUser: {
        enabled: true,
      },
    },
    plugins: [
      openAPI(),
      customProviders(env),
      getSocialProviders(),
      apiKey({
        // Allows easy use of user/session in endpoints, and avoids double-incrementing the
        // ratelimiting to manually verify session at client then use it. Downside is that now
        // API keys technically allow full impersonation of the user which can be a security risk.
        enableSessionForAPIKeys: true,
        rateLimit: {
          enabled: false,
        },
      }),
      organization({
        allowUserToCreateOrganization: false,
        cancelPendingInvitationsOnReInvite: true,
        requireEmailVerificationOnInvitation: true, // Mitigates the security risk for someone signing up with leaked invite link
        sendInvitationEmail: async (data) => {
          const url = `${env.FRONTEND_URL}/auth/accept-invitation?invitationId=${data.id}`;

          await sendEmail(env, {
            to: data.email,
            subject: "Invitation to join an organization",
            react: orgInviteEmailTemplate(data.email, env.FRONTEND_URL, url),
          });
        },
      }),
    ],
    account: {
      accountLinking: {
        // TODO: consider always requiring explicit login to link OIDC accounts if `allowDifferentEmails: true`.
        // That would mitigate the potential for account takeover as suggested in the Better Auth docs, even though it is slightly inconvenient for the user.
        // This can be done by setting the custom providers config `prompt: "login"`.
        allowDifferentEmails: true,
        encryptOAuthTokens: true,
        trustedProviders: ["orcid"],
      },
    },
    trustedOrigins: formatAllowedOrigins(env),
    database: drizzleAdapter(db as any, {
      provider: "pg",
      schema: { ...authSchema, ...organizationSchema, ...apikeySchema },
    }),
  });
};
