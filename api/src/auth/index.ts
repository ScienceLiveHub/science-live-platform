import { createDb } from "@/db";
import { organizationSchema } from "@/db/schema/organization";
import * as authSchema from "@/db/schema/user";
import { sendEmail } from "@/email";
import { createNotification } from "@/notifications";
import { daysFromNow, isValidEmail } from "@/utils";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  createAuthEndpoint,
  createAuthMiddleware,
  openAPI,
  organization,
} from "better-auth/plugins";
import { eq } from "drizzle-orm";
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
      autoSignInAfterVerification: true,
      async afterEmailVerification(user: any, request: any) {
        await createNotification(env, user.id, {
          title: "Your email has been verified",
          type: "approval",
          expiresAt: daysFromNow(2),
        });
      },
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
          await createNotification(env, user.id, {
            title: "Check your email for verification",
            type: "info",
            content: "You need to verify your email in order to publish",
          });
          await sendEmail(env, {
            to: user.email,
            subject: "Verify your email address",
            react: verifyEmailTemplate(user.name, env.FRONTEND_URL, url),
          });
        }
      },
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
      organization({
        allowUserToCreateOrganization: false,
        sendInvitationEmail: async (data) => {
          const url = `${env.FRONTEND_URL}/accept-invitation?invitationId=${data.id}`;
          // Look up the invited user by data.email, if they already exist, create a notification as well
          const userData = await db
            ?.select({
              id: authSchema.user.id,
            })
            .from(authSchema.user)
            .where(eq(authSchema.user.email, data.email))
            .limit(1);

          if (userData?.[0].id) {
            await createNotification(env, data.email, {
              title: `Invitation to join ${data.organization.name + (data.role !== "member" ? ` as ${data.role}` : "")}`,
              type: "invite",
              link: url,
              content: "Click to view invite",
              expiresAt: data.invitation.expiresAt,
            });
          }

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
      schema: { ...authSchema, ...organizationSchema },
    }),
  });
};
