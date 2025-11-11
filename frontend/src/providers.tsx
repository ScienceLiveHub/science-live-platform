/*
 * Providers to apply to all routes
 *
 *  - AuthUIProvider: Enables Better Auth UI components to be used
 *  - ThemeProvider: Enables switching between light/dark/system theme using a button
 */

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { authClient } from "./lib/auth-client";
import { ThemeProvider } from "@/components/theme-provider";
import { Link, useNavigate } from "react-router-dom";
import React from "react";

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

const ORCIDIcon = () => <i className="fa-brands fa-orcid"></i>;

export function Providers({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <AuthUIProvider
      authClient={authClient}
      Link={LinkWithHref}
      navigate={navigate}
      // Built-in auth providers
      social={{
        providers: [
          /*"github", "google"*/
        ],
      }}
      // Custom auth providers
      genericOAuth={{
        providers: [
          {
            provider: "orcid",
            name: "ORCID",
            icon: ORCIDIcon,
          },
        ],
      }}
    >
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        {children}
      </ThemeProvider>
    </AuthUIProvider>
  );
}
