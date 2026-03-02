import { authClient } from "@/lib/auth-client";
import ky from "ky";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import NanopubEditor from "./components/NanopubEditor";

export default function CreateNanopub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const templateUri = searchParams.get("template") || null;
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { data: session, isPending } = authClient.useSession();

  // Load signing profile when session is available
  useEffect(() => {
    if (isPending || !session?.user) {
      return;
    }

    const loadSigningProfile = async () => {
      try {
        // Fetch current user's signing profile including private key
        const response = await ky(
          `${import.meta.env.VITE_API_URL}/signing/profile`,
          { credentials: "include" },
        );

        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("Error loading signing profile:", error);
      }
    };

    loadSigningProfile();
  }, [session, isPending]);

  const handleTemplateChange = (uri: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (uri) {
      next.set("template", uri);
    } else {
      next.delete("template");
    }
    setSearchParams(next);
  };

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-6xl">
      <NanopubEditor
        key={templateUri ?? "default"}
        identity={currentUser}
        templateUri={templateUri}
        onTemplateUriChange={handleTemplateChange}
        embedded={false}
        demoMode={true} // TODO: currently hard coded as demo for web app
        orcidLinkAction={async () =>
          await authClient.linkSocial({ provider: "orcid" })
        } // TODO: ideally this should open in a new window so it doesn't wipe out the form entries
      />
    </main>
  );
}
