import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useNanopub, UserId } from "@/hooks/use-nanopub";
import { NanopubStore } from "@/lib/nanopub-store";
import { NanopubViewer } from "@/pages/np/create/components/NanopubViewer";
import { FileCode } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TEMPLATE_URI } from "./create/components/templates/registry-metadata";
import { ViewAIDASentence } from "./view/ViewAIDASentence";
import { ViewAnnotateQuotation } from "./view/ViewAnnotateQuotation";
import { ViewCitationWithCiTO } from "./view/ViewCitationWithCiTO";
import { ViewCommentOnPaper } from "./view/ViewCommentOnPaper";
import { ViewGeographicalCoverage } from "./view/ViewGeographicalCoverage";

/**
 * ViewNanopub
 *
 * - Render a nanopub in a user-friendly way.
 * - Pass in a nanopub `store`, otherwise it will look in the `uri` query
 *   parameter and fetch it.  Failing that, show a text field where the user
 *   can enter a URI themselves.
 * - If the nanopub was created from a known template, renders a custom
 *   template-specific view. Otherwise falls back to the generic NanopubViewer
 *   which displays graphs (Head, Assertion, Provenance, PubInfo) and triples.
 */

/**
 * Renders either a custom template-specific view or the generic NanopubViewer.
 * Uses direct conditional rendering to avoid the "component created during render" lint error.
 */
export function SmartNanopubViewer({
  store,
  creatorUserIdsByOrcid,
}: {
  store: NanopubStore;
  creatorUserIdsByOrcid: Record<string, UserId | null>;
}) {
  const templateUri = store.metadata.template;

  switch (templateUri) {
    case TEMPLATE_URI.CITATION_CITO:
      return (
        <ViewCitationWithCiTO
          store={store}
          creatorUserIdsByOrcid={creatorUserIdsByOrcid}
        />
      );
    case TEMPLATE_URI.ANNOTATE_QUOTATION:
      return (
        <ViewAnnotateQuotation
          store={store}
          creatorUserIdsByOrcid={creatorUserIdsByOrcid}
        />
      );
    case TEMPLATE_URI.COMMENT_PAPER:
      return (
        <ViewCommentOnPaper
          store={store}
          creatorUserIdsByOrcid={creatorUserIdsByOrcid}
        />
      );
    case TEMPLATE_URI.AIDA_SENTENCE:
      return (
        <ViewAIDASentence
          store={store}
          creatorUserIdsByOrcid={creatorUserIdsByOrcid}
        />
      );
    case TEMPLATE_URI.GEO_COVERAGE:
      return (
        <ViewGeographicalCoverage
          store={store}
          creatorUserIdsByOrcid={creatorUserIdsByOrcid}
        />
      );
    default:
      return (
        <NanopubViewer
          store={store}
          creatorUserIdsByOrcid={creatorUserIdsByOrcid}
        />
      );
  }
}

export default function ViewNanopub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const uri = searchParams.get("uri") || "";

  const [inputUri, setInputUri] = useState(uri);
  const { store, loading, error, creatorUserIdsByOrcid } = useNanopub(uri);

  useEffect(() => {
    setInputUri(uri);
  }, [uri]);

  const handleLoadClick = () => {
    if (!inputUri) return;

    // Just update the browsers URL with the new URI when user clicks Load button
    // This will in turn trigger the useEffect hook which calls loadNanopubUri
    const next = new URLSearchParams(searchParams);
    next.set("uri", inputUri);
    setSearchParams(next);
  };

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="flex items-center text-xl text-muted-foreground font-black">
          <FileCode className="mr-4" />
          VIEW NANOPUBLICATION
        </h1>
        <div className="flex gap-2 w-full md:w-auto">
          <Input
            type="text"
            className="flex-1 md:w-130"
            placeholder="Enter URI e.g. https://w3id.org/np/... or http://purl.org/nanopub/..."
            value={inputUri}
            onChange={(e) => setInputUri(e.target.value)}
          />
          <Button
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            disabled={loading}
            onClick={handleLoadClick}
          >
            Load
          </Button>
        </div>
      </div>

      {/* Status / Errors */}
      {loading && (
        <div className="rounded-md border bg-muted/30 p-4 flex items-center gap-3 text-muted-foreground">
          <Spinner /> <span>Loading nanopublication...</span>
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-900">
          {error}
        </div>
      )}
      {uri ? (
        <>
          {!loading && !error && (
            <>
              {store ? (
                <SmartNanopubViewer
                  store={store}
                  creatorUserIdsByOrcid={creatorUserIdsByOrcid}
                />
              ) : null}
            </>
          )}
        </>
      ) : (
        <>Load a URI above.</>
      )}
    </main>
  );
}
