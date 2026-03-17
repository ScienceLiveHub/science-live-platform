import { COMMON_LABELS, getWellKnownLabel } from "@/lib/nanopub-store";
import { fetchQuads, NS, shrinkUri } from "@/lib/rdf";
import {
  extractDoisFromText,
  extractWikidataEntityId,
  isWikidataEntityUri,
} from "@/lib/uri";
import ky from "ky";
import { NamedNode, Term, Util } from "n3";
import { useCallback, useRef, useState } from "react";

const { isNamedNode } = Util;

export interface LabelStore {
  getLabel: (term: Term | string, prefixes?: Record<string, string>) => string;
  isLoading: (uri: string) => boolean;
}

export function useLabels(storeLabelCache: Record<string, string>): LabelStore {
  // Use a ref for the loading set to avoid re-render loops.
  // The ref provides a stable dedup guard that doesn't cause new closures
  // on every state change, preventing infinite fetch/render cycles.
  const loadingUrisRef = useRef<Set<string>>(new Set());
  // A simple counter state to trigger re-renders when labels resolve.
  const [, setLabelVersion] = useState(0);

  const fetchAndCacheRemoteLabel = useCallback(
    async (uri: string) => {
      if (storeLabelCache[uri]) {
        return storeLabelCache[uri];
      }
      // Cancel if already loading
      if (loadingUrisRef.current.has(uri)) {
        return;
      }
      // Add to loading set so we only fetch once
      loadingUrisRef.current.add(uri);

      let label: string | undefined = undefined;

      try {
        const doi = extractDoisFromText(uri)?.[0];
        if (doi) {
          // Try to resolve the title of the DOI using crossref API
          const data = (await ky
            .get(`https://api.crossref.org/works/${doi}`)
            .json()) as { message?: { title?: string[] } };
          const title = data?.message?.title?.[0] || doi;
          if (title) {
            label = title;
          }
        } else if (isWikidataEntityUri(uri)) {
          const entityId = extractWikidataEntityId(uri)!;
          const data = (await ky
            .get(
              `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&languages=en&props=labels&format=json&origin=*`,
            )
            .json()) as {
            entities?: Record<
              string,
              { labels?: Record<string, { value?: string }> }
            >;
          };
          label = data?.entities?.[entityId]?.labels?.en?.value;
        } else if (uri.startsWith("https://orcid.org/")) {
          try {
            const orcidId = uri.split("https://orcid.org/")[1];
            const data = (await ky
              .get(
                `${import.meta.env.VITE_API_URL}/orcid/display-name?orcid=${encodeURIComponent(uri)}`,
              )
              .json()) as { displayName?: string };
            label = data?.displayName ?? orcidId;
          } catch (error) {
            console.warn(
              `Failed to fetch ORCID display name for ${uri}:`,
              error,
            );
          }
        } else if (uri.includes("purl.obolibrary.org/obo/")) {
          // OBO Foundry ontology terms - use EBI's Ontology Lookup Service API
          try {
            const data = (await ky
              .get(
                `https://www.ebi.ac.uk/ols4/api/terms?iri=${encodeURIComponent(uri)}`,
              )
              .json()) as {
              _embedded?: { terms?: Array<{ label?: string }> };
            };
            label = data?._embedded?.terms?.[0]?.label;
          } catch (error) {
            console.warn(`Failed to fetch OBO term label for ${uri}:`, error);
          }
        } else if (
          uri.includes("omg.org/spec/LCC/Languages") ||
          uri.includes("lexvo.org")
        ) {
          // Language URIs - extract code and use Intl.DisplayNames
          const code = uri.split("/").pop();
          if (code && (code.length === 2 || code.length === 3)) {
            try {
              const displayNames = new Intl.DisplayNames(["en"], {
                type: "language",
              });
              const name = displayNames.of(code.toLowerCase());
              if (name && name !== code) {
                label = name;
              }
            } catch {
              // Fallback if Intl API fails
            }
          }
        } else {
          // Try to fetch RDF and look for labels or names
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
              // TODO: we should stop searching if we found it. How do we exit this callback? throw error?
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch label for ${uri}:`, error);
      } finally {
        // TODO: if it failed, is it better to save uri, short uri or nothing?
        storeLabelCache[uri] = label ?? uri;
        // Always remove from loading set regardless of whether it failed or succeeded
        loadingUrisRef.current.delete(uri);
        // Bump version to trigger a re-render so the resolved label is displayed
        setLabelVersion((v) => v + 1);
      }
    },
    [storeLabelCache],
  );

  const getLabel = useCallback(
    (term: Term | string, prefixes?: Record<string, string>): string => {
      const uri = isNamedNode(term as Term)
        ? (term as NamedNode).id
        : (term as string);

      // If we already have a cached label, return it
      if (storeLabelCache?.[uri]) {
        return storeLabelCache[uri];
      }

      // Also check common labels
      if (COMMON_LABELS[uri]) {
        return COMMON_LABELS[uri];
      }

      // Check well-known URIs (e.g. academic databases)
      const wellKnown = getWellKnownLabel(uri);
      if (wellKnown) {
        return wellKnown;
      }

      // Otherwise return shortened URI as label for now, and start an async fetch for something better
      if (!loadingUrisRef.current.has(uri)) {
        fetchAndCacheRemoteLabel(uri);
      }

      return shrinkUri(uri, prefixes || {});
    },
    [fetchAndCacheRemoteLabel, storeLabelCache],
  );

  // For checking whether any URIs are loading, or a specific URI if specified
  const isLoading = useCallback((uri?: string): boolean => {
    return uri
      ? loadingUrisRef.current.has(uri)
      : !!loadingUrisRef.current.size;
  }, []);

  return {
    getLabel,
    isLoading,
  };
}

/**
 * Resolves a URI label asynchronously using the useLabels hook,
 * displaying a shortened URI while loading and the resolved label once ready.
 */
export function AsyncLabel({ uri }: { uri: string }) {
  const [labelCache] = useState<Record<string, string>>(() => ({}));
  const { getLabel } = useLabels(labelCache);
  return <>{getLabel(uri)}</>;
}
