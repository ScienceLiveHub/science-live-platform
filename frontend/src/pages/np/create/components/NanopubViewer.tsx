import { Citation } from "@/components/np/citation";
import { GraphSection, PubInfoSection } from "@/components/np/graph-section";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ItemSeparator } from "@/components/ui/item";
import { SnippetCopyButton } from "@/components/ui/shadcn-io/snippet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserId } from "@/hooks/use-nanopub";
import { NanopubStore } from "@/lib/nanopub-store";
import { shrinkUri, Statement } from "@/lib/rdf";
import { toRegistryDownloadUrl } from "@/lib/uri";
import {
  Copy,
  Download,
  ExternalLink,
  File,
  LucideIcon,
  Microscope,
  Share2,
  UserCircle,
} from "lucide-react";
import { useMemo } from "react";
import { VIEW_COMPONENTS } from "../../view/view-registry";
import { NanopubOverview } from "./NanopubOverview";

const MenuItem = ({
  text = "",
  Icon,
  href = "#",
}: {
  text: string;
  Icon: LucideIcon;
  href?: string;
}) => (
  <a href={href} target="_blank" rel="noreferrer">
    <DropdownMenuItem className="text-foreground">
      <Icon className="size-5 hover:text-foreground" />
      {text}
    </DropdownMenuItem>
  </a>
);

export function ShareMenu({ uri }: { uri: string }) {
  const fileUrl = toRegistryDownloadUrl(uri);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Share2 />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <SnippetCopyButton
          asChild
          onCopy={() => console.log(`Copied to clipboard`)}
          onError={() => console.error(`Failed to copy to clipboard`)}
          value={uri}
        >
          <DropdownMenuItem className="text-foreground">
            <Copy className="size-5 hover:text-foreground" />
            Copy URI
          </DropdownMenuItem>
        </SnippetCopyButton>
        <MenuItem text="Open original" Icon={ExternalLink} href={uri} />
        <ItemSeparator />

        <MenuItem text="TriG" Icon={Download} href={fileUrl + ".trig"} />
        <MenuItem text="JSON-LD" Icon={Download} href={fileUrl + ".jsonld"} />
        <MenuItem text="N-Quads" Icon={Download} href={fileUrl + ".nq"} />
        <MenuItem text="XML" Icon={Download} href={fileUrl + ".xml"} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Props accepted by custom template view components (e.g. ViewCitationWithCiTO).
 */
export interface CustomViewerProps {
  store: NanopubStore;
  creatorUserIdsByOrcid?: Record<string, UserId | null>;
}

export type NanopubViewerProps = {
  store: NanopubStore;
  /**
   * When provided, enables linking ORCID to their Science Live user profiles.
   */
  creatorUserIdsByOrcid?: Record<string, UserId | null>;
  showShareMenu?: boolean;
  showCitation?: boolean;
  /**
   * Optional. If provided, shows an additional tab with the RAW TriG content,
   * generally for previewing generated TriG in the nanopub creator.
   */
  generatedTrig?: string;
};

/**
 * Nanopub Viewer.
 *
 * Component which displays the given nanopub store.
 *
 * Renders the nanopub overview header, then a tabbed area with:
 *   - **Template View**: friendly template-specific view if available.
 *   - **RDF View**: the standard Assertion / Provenance / PubInfo
 *     graph sections.
 *
 * Optionally show:
 *   - A "share" menu
 *   - Citation section below the tabs
 *   - A third tab with raw Trig, if provided
 */
export function NanopubViewer({
  store,
  creatorUserIdsByOrcid = {},
  showShareMenu = true,
  showCitation = true,
  generatedTrig,
}: NanopubViewerProps) {
  const ViewComponent = store.metadata.template
    ? VIEW_COMPONENTS[store.metadata.template]
    : null;

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

  // otherGraphs should always be empty if its a valid nanopublication, but
  // keep it as a backstop for anomalies
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

  const rdfGraphsContent = (
    <section className="space-y-4">
      <GraphSection
        store={store}
        title="Assertion"
        statements={assertionStatements}
        Icon={File}
        extraClasses="border-l-8 border-l-yellow-300"
      />

      <GraphSection
        store={store}
        title="Provenance"
        statements={provenanceStatements}
        Icon={Microscope}
        extraClasses="border-l-8 border-l-purple-600"
        collapsible
      />

      <PubInfoSection
        store={store}
        title="Publication Info"
        statements={pubinfoStatements}
        Icon={UserCircle}
        extraClasses="border-l-8 border-l-blue-800"
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
            />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <>
      <NanopubOverview
        store={store}
        creatorUserIdsByOrcid={creatorUserIdsByOrcid}
        showShareMenu={showShareMenu}
      />

      <Tabs defaultValue={ViewComponent ? "template" : "rdf"}>
        {(generatedTrig || ViewComponent) && (
          <TabsList>
            <TabsTrigger value="template" disabled={!ViewComponent}>
              Template View
            </TabsTrigger>
            <TabsTrigger value="rdf">RDF View</TabsTrigger>
            {generatedTrig && <TabsTrigger value="trig">TriG View</TabsTrigger>}
          </TabsList>
        )}
        <TabsContent value="template">
          {ViewComponent && <ViewComponent store={store} />}
        </TabsContent>
        <TabsContent value="rdf">{rdfGraphsContent}</TabsContent>
        {generatedTrig && (
          <TabsContent value="trig">
            <div className="bg-muted rounded-lg p-4">
              <pre className="text-sm whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                <code>{generatedTrig}</code>
              </pre>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {showCitation ? <Citation data={store.metadata} /> : null}
    </>
  );
}
