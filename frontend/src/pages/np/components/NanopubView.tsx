import { Spinner } from "@/components/ui/spinner";
import { useNanopub } from "@/hooks/use-nanopub";
import { NanopubViewer } from "../view/NanopubViewer";
import { NanopubReferences } from "./NanopubReferences";

interface NanopubViewProps {
  /** The nanopub URI to load and display. */
  uri: string;
}

/**
 * NanopubView
 *
 * Loads a nanopublication by URI and renders the full viewer with references.
 * Manages its own loading/error state via the `useNanopub` hook.
 */
export function NanopubView({ uri }: NanopubViewProps) {
  const { store, loading, error, creatorUserIdsByOrcid } = useNanopub(uri);

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
      <NanopubReferences nanopubUri={uri} />
    </>
  );
}
