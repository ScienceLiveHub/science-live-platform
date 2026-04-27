import { Spinner } from "@/components/ui/spinner";
import { useNanopub } from "@/hooks/use-nanopub";
import { extractNanopubFragment } from "@/lib/uri";
import { useEffect, useMemo } from "react";
import { NanopubViewer } from "../view/NanopubViewer";
import { NanopubReferences } from "./NanopubReferences";

interface NanopubViewProps {
  /** The nanopub URI to load and display. May include a fragment pointing to an internal object. */
  uri: string;
}

/**
 * NanopubView
 *
 * Loads a nanopublication by URI and renders the full viewer with references.
 * Manages its own loading/error state via the `useNanopub` hook.
 * If the URI contains a fragment pointing to an internal object, sets the hash
 * so that NanopubViewer can scroll to it after loading.
 */
export function NanopubView({ uri }: NanopubViewProps) {
  const { baseUri, fragment, fullUri } = useMemo(
    () => extractNanopubFragment(uri),
    [uri],
  );

  // If the URI contains a fragment for an internal object, set it as the URL hash
  // so NanopubViewer can scroll to it after the assertion statements are rendered.
  useEffect(() => {
    if (fragment && !window.location.hash) {
      const id = `subject-${encodeURIComponent(fullUri).replace(/%/g, "-")}`;
      window.history.replaceState(null, "", `#${id}`);
    }
  }, [fragment, fullUri]);

  const { store, loading, error, creatorUserIdsByOrcid } = useNanopub(baseUri);

  if (loading) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 flex items-center gap-3 text-muted-foreground">
        <Spinner /> <span>Loading nanopublication…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-900">
        {error}
      </div>
    );
  }

  if (!store) return null;

  return (
    <>
      <NanopubViewer
        store={store}
        creatorUserIdsByOrcid={creatorUserIdsByOrcid}
      />
      <NanopubReferences nanopubUri={baseUri} />
    </>
  );
}
