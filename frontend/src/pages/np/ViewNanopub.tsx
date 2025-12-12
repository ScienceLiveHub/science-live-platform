import { Citation } from "@/components/np/citation";
import {
  CollapsibleGraphSection,
  GraphSection,
} from "@/components/np/graph-section";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ItemSeparator } from "@/components/ui/item";
import { SnippetCopyButton } from "@/components/ui/shadcn-io/snippet";
import { Spinner } from "@/components/ui/spinner";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { shrinkUri, Statement } from "@/lib/rdf";
import { parseURI as parseUri } from "@/lib/utils";
import {
  Copy,
  Download,
  ExternalLink,
  File,
  FileCode,
  LucideIcon,
  Microscope,
  Share2,
  UserCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

/**
 * ViewNanopub
 *
 * - View a nanopub fetched from the given URI, in a friendly way
 * - Displays graphs (Head, Assertion, Provenance, PubInfo) and triples in a readable format
 *
 * Intended for generic viewing of any nanopub content.
 * TODO: If the nanopub uses a supported Science Live template, then it should render a template-specific view instead.
 */

const MenuItem = ({
  text = "",
  Icon,
  href = "#",
}: {
  text: string;
  Icon: LucideIcon;
  href?: string;
}) => (
  <a href={href} target="_blank">
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

export default function ViewNanopub() {
  const params = useParams();
  const uri = parseUri(params.uri);

  const [inputUri, setInputUri] = useState(uri);
  const [currentUri, setCurrentUri] = useState(uri);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<NanopubStore | null>(null);

  // Initialize the labels hook with the store's label cache
  const { getLabel } = useLabels(store?.labelCache);

  const assertionStatements = useMemo(() => {
    return store?.graphUris.assertion
      ? store.getQuads(null, null, null, store?.graphUris.assertion)
      : [];
  }, [store]);

  const provenanceStatements = useMemo(() => {
    return store?.graphUris.provenance
      ? store.getQuads(null, null, null, store?.graphUris.provenance)
      : [];
  }, [store]);

  const pubinfoStatements = useMemo(() => {
    return store?.graphUris.pubinfo
      ? store.getQuads(null, null, null, store?.graphUris.pubinfo)
      : [];
  }, [store]);

  const loadNanopubUri = (newUri?: string) => {
    if (!newUri) return;
    setError(null);
    setLoading(true);

    NanopubStore.load(newUri, (st: NanopubStore) => {
      setStore(st);
      //TODO: update browser URL based on new URI
      setCurrentUri(newUri);
      setLoading(false);
    })
      .catch((e: any) => {
        console.error("Failed to load/parse nanopublication:", e);
        setError(e?.message || "Failed to load/parse nanopublication.");
        setStore(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Auto-load default on mount
    // Note in dev (<Strict> mode) this gets called twice, which is a "feature" not a bug
    // React does this deliberately to detect any unintended side effects or state mutations.
    // Devs should always ensure calling it multiple times does not change the page.
    if (inputUri) {
      loadNanopubUri(inputUri);
    }
  }, []);

  // otherGraphs should always be empty if its a valid nanopublication, but keep it as a backstop for anomolies
  const otherGraphs = useMemo(() => {
    store?.filter;
    // Exclude known graphs
    const known = new Set(
      [
        store?.graphUris.head,
        store?.graphUris.assertion,
        store?.graphUris.provenance,
        store?.graphUris.pubinfo,
      ].filter(Boolean) as string[],
    );
    const entries: { uri: string; statements: Statement[] }[] = [];
    store?.forEach((q) => {
      return !known.has(q.graph.value);
    });
    return entries;
  }, [store?.graphUris]);

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
            className="flex-1 md:w-[520px]"
            placeholder="Enter URI e.g. https://w3id.org/np/... or http://purl.org/nanopub/..."
            value={inputUri}
            onChange={(e) => setInputUri(e.target.value)}
          />
          <Button
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            disabled={loading}
            onClick={() => loadNanopubUri(inputUri)}
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
      {currentUri ? (
        <>
          {!loading && !error && (
            <>
              {/* Overview */}
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
                <div className="relative">
                  <div className="pr-16">
                    <h2 className="text-2xl md:text-3xl font-bold">
                      {store?.metadata.title}
                    </h2>
                    <div className="font-mono break-all">
                      <a
                        className="text-purple-600 dark:text-purple-400 hover:underline"
                        href={currentUri}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {currentUri}
                      </a>
                    </div>
                  </div>
                  <div className="absolute right-0 top-0">
                    <ShareMenu uri={currentUri} />
                  </div>
                </div>
                <div className="mt-1 text-sm space-y-1">
                  <div>
                    <span className="font-bold">Published:</span>{" "}
                    {new Date(
                      store?.metadata.created!,
                    ).toLocaleDateString() || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div>
                    <span className="font-bold">Created by:</span>{" "}
                    {store?.metadata.creators?.length ? (
                      <span className="space-x-2">
                        {store?.metadata.creators.map((c) => (
                          <a
                            key={c.name}
                            className="text-blue-600 hover:underline break-all"
                            href={
                              c.href?.startsWith("http") ? c.href : undefined
                            }
                            target={
                              c.href?.startsWith("http") ? "_blank" : undefined
                            }
                            rel={
                              c.href?.startsWith("http")
                                ? "noreferrer"
                                : undefined
                            }
                          >
                            {c.name}
                          </a>
                        ))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div>
                    <span className="font-bold">License:</span>{" "}
                    {store?.metadata.license}
                  </div>
                </div>
              </div>

              <Citation data={store?.metadata} />

              {/* Sections */}
              <section className="space-y-4">
                <GraphSection
                  store={store!}
                  title="Assertion"
                  statements={assertionStatements}
                  Icon={File}
                  extraClasses="border-l-8 border-l-yellow-300"
                  getLabel={getLabel}
                />

                <GraphSection
                  store={store!}
                  title="Provenance"
                  statements={provenanceStatements}
                  Icon={Microscope}
                  extraClasses="border-l-8 border-l-purple-600"
                  getLabel={getLabel}
                />

                <CollapsibleGraphSection
                  store={store!}
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
                        store={store!}
                        key={g.uri}
                        title={`Graph: ${shrinkUri(g.uri, store!.prefixes)}`}
                        statements={g.statements}
                        Icon={File}
                        extraClasses="border-l-8 border-l-purple-600"
                        getLabel={getLabel}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      ) : (
        <>Load a URI above.</>
      )}
    </main>
  );
}
