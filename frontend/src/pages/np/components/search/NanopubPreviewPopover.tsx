/**
 * NanopubPreviewPopover
 *
 * A popover that loads a nanopublication by URI and renders a preview
 * of the assertion, or a custom View Component if available.
 */

import { GraphSection } from "@/components/np/graph-section";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { NanopubStore } from "@/lib/nanopub-store";
import { Eye, File } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { resolveTemplateUri } from "../../create/components/templates/registry-metadata";
import { VIEW_COMPONENTS } from "../../view/view-registry";

export function NanopubPreviewPopover({ uri }: { uri: string }) {
  const [open, setOpen] = useState(false);
  const [store, setStore] = useState<NanopubStore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStore(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    NanopubStore.load(uri)
      .then((s) => {
        if (cancelled) return;
        setStore(s);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, uri]);

  const ViewComponent = useMemo(() => {
    if (!store) return null;
    const resolved =
      store.metadata.template && resolveTemplateUri(store.metadata.template);
    return resolved ? (VIEW_COMPONENTS[resolved] ?? null) : null;
  }, [store]);

  const assertionStatements = useMemo(() => {
    if (!store) return [];
    return store.graphUris.assertion
      ? store.getQuads(null, null, null, store.graphUris.assertion)
      : [];
  }, [store]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-1 rounded hover:bg-accent/10 text-muted-foreground hover:text-foreground transition-colors shrink-0 hover:cursor-pointer"
          onClick={(e) => e.stopPropagation()}
          title="Preview nanopub"
        >
          <Eye className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="start"
        className="w-lg max-h-112 overflow-y-auto p-2"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Spinner /> <span>Loading preview…</span>
          </div>
        )}
        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm">
            Failed to load preview: {error}
          </div>
        )}
        {store && ViewComponent && <ViewComponent store={store} />}
        {store && !ViewComponent && assertionStatements.length > 0 && (
          <GraphSection
            store={store}
            title="Assertion"
            statements={assertionStatements}
            Icon={File}
            extraClasses="border-l-8 border-l-yellow-300"
          />
        )}
        {store && !ViewComponent && assertionStatements.length === 0 && (
          <div className="text-sm text-muted-foreground p-2">
            No assertion triples found.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
