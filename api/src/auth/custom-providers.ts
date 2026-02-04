/*
 * Enable and configure OIDC providers which are NOT built into Better Auth
 */

import { ORCID_EMAIL_PLACEHOLDER } from "@/utils";
import { genericOAuth } from "better-auth/plugins";

export const customProviders = (env: Env) =>
  genericOAuth({
    config: [
      {
        providerId: "orcid",
        clientId: env.ORCID_CLIENT_ID as string,
        clientSecret: env.ORCID_CLIENT_SECRET as string,
        discoveryUrl: "https://orcid.org/.well-known/openid-configuration",
        scopes: ["openid"],
        prompt: "select_account",
        // In the Public API (individuals), it returns the following profile info:
        // {"id":"https://orcid.org/0001-0001-1234-5678","emailVerified":false,"name":null,"sub":"0001-0001-1234-5678","family_name":"Doe","given_name":"John"}
        // The docs mention the Member API for orgs (register/paid) returns additional data, though unclear exactly what.
        // Due to ORCID OIDC not returning an email (currently required by Better Auth v1.3, but that might change in the next major version),
        // we map the profile.sub, see https://github.com/better-auth/better-auth/issues/2059
        // Without email verification, a user will only have read-only access, so this forces them to go to their account page, enter a valid email in place of the profile.sub, and verify it.
        mapProfileToUser: async (profile) => {
          return {
            ...profile,
            name:
              profile.given_name +
              (profile.family_name?.length ? " " + profile.family_name : ""),
            email: profile.email ?? profile.sub + ORCID_EMAIL_PLACEHOLDER,
          };
        },
      },
      // Add more custom providers as needed, if they are not already built into Better Auth
      // See https://www.better-auth.com/docs/authentication/other-social-providers for more info
    ],
  });
