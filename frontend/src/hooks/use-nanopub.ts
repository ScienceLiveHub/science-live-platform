import { NanopubStore } from "@/lib/nanopub-store";
import { extractOrcidId, unique } from "@/lib/uri";
import ky from "ky";
import { useEffect, useState } from "react";

interface UseNanopubResult {
  store: NanopubStore | null;
  loading: boolean;
  error: string | null;
  creatorUserIdsByOrcid: Record<string, string | null>;
}

export function useNanopub(uri: string): UseNanopubResult {
  const [store, setStore] = useState<NanopubStore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatorUserIdsByOrcid, setCreatorUserIdsByOrcid] = useState<
    Record<string, string | null>
  >({});

  useEffect(() => {
    if (!uri) {
      setStore(null);
      setError(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);
    // Reset creators map when uri changes
    setCreatorUserIdsByOrcid({});

    const load = async () => {
      try {
        const newStore = await NanopubStore.load(uri);
        if (!mounted) return;

        setStore(newStore);

        // Map ORCIDs logic here
        const creators = newStore.metadata.creators ?? [];
        const uniqueOrcids = unique(
          creators
            .map((c) => extractOrcidId(c.href ?? ""))
            .filter((x): x is string => !!x),
        );

        if (uniqueOrcids.length > 0) {
          const entries = await Promise.all(
            uniqueOrcids.map(async (orcidId) => {
              try {
                const data = (await ky(
                  `${import.meta.env.VITE_API_URL}/user-profile/orcid/${encodeURIComponent(orcidId)}`,
                  {
                    method: "GET",
                    credentials: "include",
                  },
                ).json()) as any;

                return [orcidId, data?.userId ?? null] as const;
              } catch {
                return [orcidId, null] as const;
              }
            }),
          );
          if (mounted) {
            setCreatorUserIdsByOrcid(Object.fromEntries(entries));
          }
        }
      } catch (e: any) {
        if (mounted) {
          console.error("Failed to load/parse nanopublication:", e);
          setError(e?.message || "Failed to load/parse nanopublication.");
          setStore(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [uri]);

  return { store, loading, error, creatorUserIdsByOrcid };
}
