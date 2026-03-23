import ky from "ky";

/**
 * User identity for publishing nanopublications.
 */
export interface UserIdentity {
  name: string;
  orcid: string;
  privateKey: string;
  keyInfo?: string;
}

export const loadSigningProfile = async (
  setProfile: (profile: UserIdentity | null) => void,
) => {
  try {
    // Fetch current user's signing profile including private key
    const response = await ky(
      `${import.meta.env.VITE_API_URL}/signing/profile`,
      { credentials: "include" },
    );

    if (response.ok) {
      const userData: UserIdentity = await response.json();
      setProfile(userData);
    } else {
      setProfile(null);
    }
  } catch (error) {
    console.error("Error loading signing profile:", error);
    setProfile(null);
  }
};
