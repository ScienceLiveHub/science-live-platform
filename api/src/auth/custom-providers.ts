/*
 * Enable and configure OIDC providers which are NOT built into Better Auth
 */

import { genericOAuth } from "better-auth/plugins";

type Env = {
  ORCID_CLIENT_ID?: string;
  ORCID_CLIENT_SECRET?: string;
  [key: string]: unknown;
};

export const customProviders = (env: Env) =>
  genericOAuth({
    config: [
      {
        providerId: "orcid",
        clientId: env.ORCID_CLIENT_ID as string,
        clientSecret: env.ORCID_CLIENT_SECRET as string,
        discoveryUrl: "https://orcid.org/.well-known/openid-configuration",
        scopes: ["openid"],
      },
      // Add more custom providers as needed, if they are not already built into Better Auth
      // See https://www.better-auth.com/docs/authentication/other-social-providers for more info
    ],
  });
