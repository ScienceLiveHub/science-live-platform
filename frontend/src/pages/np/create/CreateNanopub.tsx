"use client";
import { authClient } from "@/lib/auth-client";
import { EXAMPLE_privateKey } from "@/lib/uri";
import ky from "ky";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import NanopubEditor from "./components/NanopubEditor";

export default function CreateNanopub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const templateUri = searchParams.get("template") || null;
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load current user data
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const { data: session, error: sessionError } =
          await authClient.getSession();

        if (sessionError || !session?.user) {
          console.log("No user session found");
          return;
        }

        // Fetch current user's full profile data including ORCID
        const response = await ky(
          `${import.meta.env.VITE_API_URL}/user-profile/${session.user.id}`,
        );

        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("Error loading current user data:", error);
      }
    };

    loadCurrentUser();
  }, []);

  const handleTemplateChange = (uri: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (uri) {
      next.set("template", uri);
    } else {
      next.delete("template");
    }
    setSearchParams(next);
  };

  const identity = currentUser?.orcidConnected
    ? {
        name: currentUser.name,
        orcid: currentUser.orcidId,
        privateKey: EXAMPLE_privateKey, // TODO: Replace with real key management
      }
    : null;

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-6xl">
      <NanopubEditor
        key={templateUri ?? "default"}
        identity={identity}
        templateUri={templateUri}
        onTemplateUriChange={handleTemplateChange}
        embedded={false}
      />
    </main>
  );
}
