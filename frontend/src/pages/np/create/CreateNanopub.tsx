"use client";
import { authClient } from "@/lib/auth-client";
import { EXAMPLE_privateKey } from "@/lib/uri";
import ky from "ky";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import NanopubEditor from "./components/NanopubEditor";

export default function CreateNanopub() {
  const [templateUri, setTemplateUri] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [searchParams, setSearchParams] = useSearchParams();

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

  // Sync state with URL params
  useEffect(() => {
    const uri = searchParams.get("template");
    setTemplateUri(uri || null);
  }, [searchParams]);

  const handleTemplateChange = (uri: string | null) => {
    setTemplateUri(uri);
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
    <main>
      <NanopubEditor
        identity={identity}
        templateUri={templateUri}
        onTemplateUriChange={handleTemplateChange}
        embedded={true}
      />
    </main>
  );
}
