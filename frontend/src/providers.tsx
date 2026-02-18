/*
 * Providers to apply to all routes
 *
 *  - AuthUIProvider: Enables Better Auth UI components to be used
 *  - ThemeProvider: Enables switching between light/dark/system theme using a button
 */

import { ThemeProvider } from "@/components/theme-provider";
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { SiOrcid } from "@icons-pack/react-simple-icons";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { authClient } from "./lib/auth-client";

// Wrapper around react-router-dom Link to match AuthUIProvider's Link interface.
// AuthUIProvider Link expects an `href` parameter while react-router-dom Link uses `to`
// Providing this parameter enables fast and reliable navigation with auth, without refresh.
const LinkWithHref = React.forwardRef<
  HTMLAnchorElement,
  {
    href: string;
    className?: string;
    children: React.ReactNode;
  }
>(({ href, className, children, ...props }, ref) => {
  return (
    <Link to={href} className={className} {...props} ref={ref}>
      {children}
    </Link>
  );
});

LinkWithHref.displayName = "LinkWithHref";

export function Providers({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <AuthUIProvider
      authClient={authClient}
      Link={LinkWithHref}
      navigate={navigate}
      emailVerification={true}
      deleteUser={true}
      avatar={true}
      apiKey={{ prefix: "sl_" }}
      // Built-in auth providers (currently disabled)
      social={{
        providers: [
          /*"github", "google"*/
        ],
      }}
      organization={{
        logo: true,
      }}
      // Custom auth providers
      genericOAuth={{
        providers: [
          {
            provider: "orcid",
            name: "ORCID",
            icon: () => <SiOrcid />,
          },
        ],
      }}
      account={{
        fields: ["image", "name", "privateKey"], // Include custom fields in account settings
      }}
      additionalFields={{
        privateKey: {
          label: "Private Key",
          placeholder: "",
          description:
            "Your Private Key for signing nanopublications you create",
          required: true,
          type: "string",
          multiline: true,
        },
      }}
    >
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        {children}
      </ThemeProvider>
    </AuthUIProvider>
  );
}
