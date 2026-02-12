import { COMMON_LABELS } from "@/lib/nanopub-store";
import { fetchQuads, NS, shrinkUri } from "@/lib/rdf";
import {
  extractDoisFromText,
  extractWikidataEntityId,
  isWikidataEntityUri,
} from "@/lib/uri";
import ky from "ky";
import { NamedNode, Term, Util } from "n3";
import { useCallback, useState } from "react";

const { isNamedNode } = Util;

export const kyInstance = ky.create({
  referrerPolicy: "origin-when-cross-origin",
});

export interface LabelStore {
  getLabel: (term: Term | string, prefixes?: Record<string, string>) => string;
  isLoading: (uri: string) => boolean;
}

export function useLabels(
  storeLabelCache?: Record<string, string>,
): LabelStore {
  const [labelCache, setLabelCache] = useState<Record<string, string>>(
    storeLabelCache || {},
  );
  const [loadingUris, setLoadingUris] = useState<Set<string>>(new Set());

  // Update local cache when store cache changes
  //   useEffect(() => {
  //     if (storeLabelCache) {
  //       setLabelCache((prev) => ({ ...prev, ...storeLabelCache }));
  //     }
  //   }, [storeLabelCache]);

  const fetchAndCacheRemoteLabel = useCallback(async (uri: string) => {
    // Cancel if already loading or cached
    if (labelCache[uri] || loadingUris.has(uri)) {
      return;
    }
    // Add to loading set so we only fetch once
    setLoadingUris((prev) => new Set(prev.add(uri)));

    let label: string | undefined = undefined;

    try {
      const doi = extractDoisFromText(uri)?.[0];
      if (doi) {
        // Try to resolve the title of the DOI using crossref API
        const data = (await ky
          .get(`https://api.crossref.org/works/${doi}`)
          .json()) as any;
        const title = data?.message?.title?.[0];
        if (title) {
          label = title;
        }
      } else if (isWikidataEntityUri(uri)) {
        const entityId = extractWikidataEntityId(uri)!;
        const data = (await ky
          .get(
            `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&languages=en&props=labels&format=json&origin=*`,
          )
          .json()) as any;
        label = data?.entities?.[entityId]?.labels?.en?.value;
      } else if (uri.startsWith("https://orcid.org/")) {
        try {
          const orcidId = uri.split("https://orcid.org/")[1];
          const data = (await ky
            .get(
              `${import.meta.env.VITE_API_URL}/orcid/display-name?orcid=${encodeURIComponent(uri)}`,
            )
            .json()) as any;
          label = data?.displayName ?? orcidId;
        } catch (error) {
          console.warn(`Failed to fetch ORCID display name for ${uri}:`, error);
        }
      } else {
        // Try to fetch RDF and look for labels or names
        // let label: string | undefined;

        await fetchQuads(uri, (quad) => {
          const p = quad.predicate.value;
          const s = quad.subject.value;
          // If this quad is a name or label for the current nanopub or its assertion, save it
          if (
            (s === uri ||
              s === uri + "#assertion" ||
              s === uri + "/assertion") &&
            (p === NS.RDFS("label").value || p === NS.FOAF("name").value)
          ) {
            label = quad.object.value ?? uri;
            // TODO: we should stop searching if we found it
          }
        });
      }
    } catch (error) {
      console.warn(`Failed to fetch label for ${uri}:`, error);
    } finally {
      // Always remove from loading set regardless of whether it failed or succeeded
      console.log(`✅ Finished fetching remote label ${uri}-> ${label}`);
      // TODO: if it failed, is it better to save uri, short uri or nothing?
      setLabelCache((prev) => ({ ...prev, [uri]: label ?? uri }));
      setLoadingUris((prev) => {
        prev.delete(uri);
        return new Set(prev);
      });
    }
  }, []);

  const getLabel = useCallback(
    (term: Term | string, prefixes?: Record<string, string>): string => {
      const uri = isNamedNode(term as Term)
        ? (term as NamedNode).id
        : (term as string);

      // If we already have a cached label, return it
      if (labelCache[uri]) {
        return labelCache[uri];
      }

      // Also check common labels
      if (COMMON_LABELS[uri]) {
        return COMMON_LABELS[uri];
      }

      // Otherwise return shortened URI as label for now, and start an async fetch for something better
      if (!loadingUris.has(uri)) {
        fetchAndCacheRemoteLabel(uri);
      }

      return shrinkUri(uri, prefixes || {});
    },
    [fetchAndCacheRemoteLabel, loadingUris],
  );

  const isLoading = useCallback(
    (uri: string): boolean => {
      return loadingUris.has(uri);
    },
    [loadingUris],
  );

  return {
    getLabel,
    isLoading,
  };
}
