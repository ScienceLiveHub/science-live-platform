/**
 * EmbedViewer
 *
 * Embeddable nanopub viewer page. Loads a nanopub by URI and renders
 * the template view without the app shell.
 *
 * Query params:
 *   ?uri=<nanopub-uri>     - Required. The nanopub to display.
 *   ?showShare=false        - Hide the share menu (default: true)
 *   ?showCitation=false     - Hide the citation section (default: true)
 *   ?showReferences=false   - Hide the references section (default: true)
 */

import { Spinner } from "@/components/ui/spinner";
import { useNanopub } from "@/hooks/use-nanopub";
import { NanopubReferences } from "@/pages/np/components/NanopubReferences";
import { NanopubViewer } from "@/pages/np/view/NanopubViewer";
import { useSearchParams } from "react-router-dom";

function parseBool(value: string | null, defaultValue: boolean): boolean {
  if (value === null) return defaultValue;
  return value !== "false" && value !== "0";
}

export function EmbedViewer() {
  const [searchParams] = useSearchParams();
  const uri = searchParams.get("uri") || "";
  const showShare = parseBool(searchParams.get("showShare"), true);
  const showCitation = parseBool(searchParams.get("showCitation"), true);
  const showReferences = parseBool(
    searchParams.get("showReferences"),
    true,
  );

  const { store, loading, error, creatorUserIdsByOrcid } = useNanopub(uri);

  if (!uri) {
    return (
      <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950 p-4 text-yellow-900 dark:text-yellow-100">
        Missing <code>uri</code> parameter. Usage:{" "}
        <code>/embed/view?uri=https://w3id.org/np/RA...</code>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 flex items-center gap-3 text-muted-foreground">
        <Spinner /> <span>Loading nanopublication…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950 p-4 text-red-900 dark:text-red-100">
        {error}
      </div>
    );
  }

  if (!store) return null;

  return (
    <div className="space-y-4">
      <NanopubViewer
        store={store}
        creatorUserIdsByOrcid={creatorUserIdsByOrcid}
        showShareMenu={showShare}
        showCitation={showCitation}
      />
      {showReferences && <NanopubReferences nanopubUri={uri} />}
    </div>
  );
}
