import { COMMON_LABELS, getWellKnownLabel } from "@/lib/nanopub-store";
import { fetchQuads, NS, shrinkUri } from "@/lib/rdf";
import {
  extractDoisFromText,
  extractWikidataEntityId,
  isWikidataEntityUri,
} from "@/lib/uri";
import ky from "ky";
import { NamedNode, Term, Util } from "n3";
import { useCallback, useEffect, useRef, useState } from "react";

const { isNamedNode } = Util;

// Global shared cache for labels across all instances
const globalLabelCache: Record<string, string> = {};
// Global set of URIs currently being fetched
const globalLoadingUris = new Set<string>();
// Global map of pending promises for deduplication
const globalPendingFetches = new Map<string, Promise<string>>();
// Subscribers for cache updates - each subscriber is a callback that receives the URI and resolved label
const globalSubscribers = new Set<(uri: string, label: string) => void>();

function notifySubscribers(uri: string, label: string) {
  globalSubscribers.forEach((callback) => callback(uri, label));
}

/**
 * Core function that fetches a label from remote sources.
 * This is the single source of truth for label-fetching logic.
 * Returns the resolved label, or undefined if not found.
 */
async function fetchLabelFromSource(uri: string): Promise<string | undefined> {
  let label: string | undefined = undefined;

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
      console.warn(`Failed to fetch ORCID display name for ${uri}:`, error);
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
        (s === uri || s === uri + "#assertion" || s === uri + "/assertion") &&
        (p === NS.RDFS("label").value || p === NS.FOAF("name").value)
      ) {
        label = quad.object.value ?? uri;
        // TODO: we should stop searching if we found it. How do we exit this callback? throw error?
      }
    });
  }

  return label;
}

/**
 * Fetches a remote label using the global cache with deduplication.
 */
async function fetchRemoteLabel(uri: string): Promise<string> {
  // Check if we already have a cached label
  if (globalLabelCache[uri]) {
    return globalLabelCache[uri];
  }

  // Check if there's already a pending fetch for this URI - return that promise
  if (globalPendingFetches.has(uri)) {
    return globalPendingFetches.get(uri)!;
  }

  // Start a new fetch
  const fetchPromise = (async () => {
    let label: string | undefined = undefined;

    try {
      label = await fetchLabelFromSource(uri);
    } catch (error) {
      console.warn(`Failed to fetch label for ${uri}:`, error);
    }

    // Cache the result (use URI as fallback if no label found)
    // TODO: If a label changes or become available AFTER this, we should clear
    //       it from the cache and/or refresh it to get the latest. We could
    //       also add time-based expiry.
    const resolvedLabel = label ?? uri;
    globalLabelCache[uri] = resolvedLabel;
    globalLoadingUris.delete(uri);
    globalPendingFetches.delete(uri);

    // Notify all subscribers about the resolved label
    notifySubscribers(uri, resolvedLabel);

    return resolvedLabel;
  })();

  // Store the pending promise for deduplication
  globalPendingFetches.set(uri, fetchPromise);
  globalLoadingUris.add(uri);

  return fetchPromise;
}

export interface LabelStore {
  getLabel: (term: Term | string, prefixes?: Record<string, string>) => string;
  isLoading: (uri?: string) => boolean;
}

/**
 * Hook for resolving labels from URIs with optional local caching.
 *
 * @param storeLabelCache - Optional local cache for labels. If not provided,
 *                          uses the global shared cache.
 * @returns LabelStore with getLabel and isLoading functions
 */
export function useLabels(
  storeLabelCache?: Record<string, string>,
): LabelStore {
  // Determine which cache to use: provided local cache or global cache
  const useGlobalCache = !storeLabelCache;
  const cache = storeLabelCache ?? globalLabelCache;

  // Use a ref for the loading set to avoid re-render loops (local cache mode only).
  const loadingUrisRef = useRef<Set<string>>(new Set());
  // A simple counter state to trigger re-renders when labels resolve.
  const [, setLabelVersion] = useState(0);

  // Subscribe to global cache updates when using global cache
  useEffect(() => {
    if (!useGlobalCache) return;

    const handleUpdate = () => {
      // Bump version to trigger a re-render so resolved labels are displayed
      setLabelVersion((v) => v + 1);
    };

    globalSubscribers.add(handleUpdate);
    return () => {
      globalSubscribers.delete(handleUpdate);
    };
  }, [useGlobalCache]);

  const getLabel = useCallback(
    (term: Term | string, prefixes?: Record<string, string>): string => {
      const uri = isNamedNode(term as Term)
        ? (term as NamedNode).id
        : (term as string);

      // If we already have a cached label, return it
      if (cache?.[uri]) {
        return cache[uri];
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

      // Start an async fetch for the label
      if (useGlobalCache) {
        // Use global deduplication mechanism
        if (!globalLoadingUris.has(uri)) {
          fetchRemoteLabel(uri);
        }
      } else if (!loadingUrisRef.current.has(uri)) {
        // Local cache mode - use local deduplication
        loadingUrisRef.current.add(uri);
        fetchLabelFromSource(uri)
          .then((label) => {
            cache[uri] = label ?? uri;
          })
          .catch((error) => {
            console.warn(`Failed to fetch label for ${uri}:`, error);
            cache[uri] = uri;
          })
          .finally(() => {
            loadingUrisRef.current.delete(uri);
            setLabelVersion((v) => v + 1);
          });
      }

      return shrinkUri(uri, prefixes || {});
    },
    [cache, useGlobalCache],
  );

  // For checking whether any URIs are loading
  const isLoading = useCallback(
    (uri?: string): boolean => {
      if (useGlobalCache) {
        return uri ? globalLoadingUris.has(uri) : !!globalLoadingUris.size;
      }
      return uri
        ? loadingUrisRef.current.has(uri)
        : !!loadingUrisRef.current.size;
    },
    [useGlobalCache],
  );

  return {
    getLabel,
    isLoading,
  };
}

/**
 * Resolves a URI label asynchronously using a global shared cache,
 * displaying a shortened URI while loading and the resolved label once ready.
 *
 * This component is a thin wrapper around the useLabels hook,
 * using the global cache for shared deduplication across all instances.
 */
export function AsyncLabel({
  uri,
  link = false,
}: {
  uri: string;
  link?: boolean;
}) {
  const { getLabel } = useLabels(); // Uses global cache by default
  return link ? <a href={uri}>{getLabel(uri)}</a> : <>{getLabel(uri)}</>;
}
