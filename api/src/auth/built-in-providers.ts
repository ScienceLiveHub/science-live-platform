/*
 * Enable and configure OIDC providers which are built into Better Auth
 */

// Enable providers here and add any specicial configuration below
// See https://www.better-auth.com/docs for a list of Social Signin providers
const providers: string[] = [
  // "github",
  // "google",
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

export const builtInProviders = (env: Env | any) =>
  providers.reduce<Record<string, ProviderConfig>>((acc, provider) => {
    const U = provider.toUpperCase();
    const id = env[`${U}_CLIENT_ID`];
    const secret = env[`${U}_CLIENT_SECRET`];

    // Add clientId and clientSecret - required for all providers
    if (typeof id === "string" && id && typeof secret === "string" && secret) {
      acc[provider] = { clientId: id, clientSecret: secret };
    }

    // Add provider-specific config where required

    // if (provider === "github" && acc[provider]) {
    //   // Define extra params in ProviderConfig then add them here
    // }
    // if (provider === "google" && acc[provider]) {
    //   // Define extra params in ProviderConfig then add them here
    // }
    return acc;
  }, {});
