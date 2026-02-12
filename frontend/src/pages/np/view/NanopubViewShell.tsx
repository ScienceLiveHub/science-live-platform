/**
 * NanopubViewShell
 *
 * Shared wrapper for all custom nanopub view components.
 * Provides:
 * - Title, author, date, type badges, license (same as NanopubViewer overview)
 * - Share menu
 * - A slot for the custom template-specific content
 * - Citation section
 * - Collapsible "Raw RDF" section showing the full generic graph sections
 */

import { Citation } from "@/components/np/citation";
import { GraphSection, PubInfoSection } from "@/components/np/graph-section";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLabels } from "@/hooks/use-labels";
import { UserId } from "@/hooks/use-nanopub";
import { NanopubStore } from "@/lib/nanopub-store";
import { shrinkUri, Statement } from "@/lib/rdf";
import { ChevronsUpDown, File, Microscope, UserCircle } from "lucide-react";
import { ReactNode, useMemo } from "react";
import { NanopubOverview } from "../create/components/NanopubOverview";

export interface CustomViewerProps {
  store: NanopubStore;
  creatorUserIdsByOrcid?: Record<string, UserId | null>;
}

export interface NanopubViewShellProps {
  store: NanopubStore;
  creatorUserIdsByOrcid?: Record<string, UserId | null>;
  /** The custom content to render between the header and the raw RDF */
  children: ReactNode;
}

export function NanopubViewShell({
  store,
  creatorUserIdsByOrcid = {},
  children,
}: NanopubViewShellProps) {
  const { getLabel } = useLabels(store.labelCache);

  const assertionStatements = useMemo(() => {
    return store.graphUris.assertion
      ? store.getQuads(null, null, null, store.graphUris.assertion)
      : [];
  }, [store]);

  const provenanceStatements = useMemo(() => {
    return store.graphUris.provenance
      ? store.getQuads(null, null, null, store.graphUris.provenance)
      : [];
  }, [store]);

  const pubinfoStatements = useMemo(() => {
    return store.graphUris.pubinfo
      ? store.getQuads(null, null, null, store.graphUris.pubinfo)
      : [];
  }, [store]);

  const otherGraphs = useMemo(() => {
    const known = new Set(
      [
        store.graphUris.head,
        store.graphUris.assertion,
        store.graphUris.provenance,
        store.graphUris.pubinfo,
      ].filter(Boolean) as string[],
    );

    const byGraph = new Map<string, Statement[]>();
    store.forEach((q) => {
      const graphUri = q.graph.value;
      if (known.has(graphUri)) return;
      const current = byGraph.get(graphUri);
      if (current) {
        current.push(q as unknown as Statement);
      } else {
        byGraph.set(graphUri, [q as unknown as Statement]);
      }
    });

    return Array.from(byGraph.entries()).map(([uri, statements]) => ({
      uri,
      statements,
    }));
  }, [store]);

  return (
    <>
      {/* Header */}
      <NanopubOverview
        store={store}
        creatorUserIdsByOrcid={creatorUserIdsByOrcid}
        showShareMenu
      />

      {/* Custom Template Content */}
      {children}

      <Citation data={store.metadata} />

      {/* Collapsible Raw RDF Graphs */}
      <Collapsible>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="gap-2 text-muted-foreground">
              <ChevronsUpDown className="h-4 w-4" />
              Show Raw RDF Graphs
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <section className="space-y-4 mt-4">
            <GraphSection
              store={store}
              title="Assertion"
              statements={assertionStatements}
              Icon={File}
              extraClasses="border-l-8 border-l-yellow-300"
              getLabel={getLabel}
            />

            <GraphSection
              store={store}
              title="Provenance"
              statements={provenanceStatements}
              Icon={Microscope}
              extraClasses="border-l-8 border-l-purple-600"
              getLabel={getLabel}
              collapsible
            />

            <PubInfoSection
              store={store}
              title="Publication Info"
              statements={pubinfoStatements}
              Icon={UserCircle}
              extraClasses="border-l-8 border-l-blue-800"
              getLabel={getLabel}
            />

            {otherGraphs.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">Other Graphs</h2>
                {otherGraphs.map((g) => (
                  <GraphSection
                    store={store}
                    key={g.uri}
                    title={`Graph: ${shrinkUri(g.uri, store.prefixes)}`}
                    statements={g.statements}
                    Icon={File}
                    extraClasses="border-l-8 border-l-purple-600"
                    getLabel={getLabel}
                  />
                ))}
              </div>
            )}
          </section>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
