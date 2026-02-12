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
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { shrinkUri, Statement } from "@/lib/rdf";
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
        {/* TODO: these dont work yet */}
        <MenuItem text="TriG" Icon={Download} />
        <MenuItem text="JSON-LD" Icon={Download} />
        <MenuItem text="N-Quads" Icon={Download} />
        <MenuItem text="XML" Icon={Download} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type NanopubViewerProps = {
  store: NanopubStore;
  /**
   * When provided, enables linking ORCID creators to their Science Live user
   * profiles.
   */
  creatorUserIdsByOrcid?: Record<string, string | null>;
  showShareMenu?: boolean;
  showCitation?: boolean;
};

export function NanopubViewer({
  store,
  creatorUserIdsByOrcid = {},
  showShareMenu = true,
  showCitation = true,
}: NanopubViewerProps) {
  // Initialize the labels hook with the store's label cache
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

  // otherGraphs should always be empty if its a valid nanopublication, but keep it as a backstop for anomalies
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
      <NanopubOverview
        store={store}
        creatorUserIdsByOrcid={creatorUserIdsByOrcid}
        showShareMenu={showShareMenu}
      />

      {/* Sections */}
      <section className="space-y-4">
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
      {showCitation ? <Citation data={store.metadata} /> : null}
    </>
  );
}
