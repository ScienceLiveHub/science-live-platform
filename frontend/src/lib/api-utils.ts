import ky from "ky";

export const loadSigningProfile = async (
  setProfile: (profile: any | null) => void,
) => {
  try {
    // Fetch current user's signing profile including private key
    const response = await ky(
      `${import.meta.env.VITE_API_URL}/signing/profile`,
      { credentials: "include" },
    );

    if (response.ok) {
      const userData = await response.json();
      setProfile(userData);
    } else {
      setProfile(null);
    }
  } catch (error) {
    console.error("Error loading signing profile:", error);
    setProfile(null);
  }
};
