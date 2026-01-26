import { Citation } from "@/components/np/citation";
import {
  CollapsibleGraphSection,
  GraphSection,
} from "@/components/np/graph-section";
import { Badge } from "@/components/ui/badge";
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
import { useNanopub } from "@/hooks/use-nanopub";
import { NanopubStore } from "@/lib/nanopub-store";
import { shrinkUri, Statement } from "@/lib/rdf";
import { extractOrcidId } from "@/lib/uri";
import {
  Copy,
  Download,
  ExternalLink,
  File,
  FileCode,
  LucideIcon,
  Microscope,
  Share2,
  User,
  UserCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

/**
 * ViewNanopub
 *
 * - Render a nanopub in a user-friendly way.
 * - Pass in a nanopub `store`, otherwise it will look in the `uri` query
 *   paraneter and fetch it.  Failing that, show a text field where the user
 *   can enter a URI themselves.
 * - Displays graphs (Head, Assertion, Provenance, PubInfo) and triples in a
 *   readable format.
 *
 * Intended for generic viewing of any nanopub content.
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

export default function ViewNanopub({
  store: propStore,
}: {
  store?: NanopubStore;
} = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const uri = searchParams.get("uri") || propStore?.metadata.uri || "";

  const [inputUri, setInputUri] = useState(uri);
  const { store, loading, error, creatorUserIdsByOrcid } = useNanopub(
    propStore || uri,
  );

  // Initialize the labels hook with the store's label cache
  const { getLabel } = useLabels(store?.labelCache);

  useEffect(() => {
    setInputUri(uri);
  }, [uri]);

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

  const handleLoadClick = () => {
    if (!inputUri) return;

    // Just update the browsers URL with the new URI when user clicks Load button
    // This will in turn trigger the useEffect hook which calls loadNanopubUri
    const next = new URLSearchParams(searchParams);
    next.set("uri", inputUri);
    setSearchParams(next);
  };

  // otherGraphs should always be empty if its a valid nanopublication, but keep it as a backstop for anomolies
  const otherGraphs = useMemo(() => {
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
  }, [store]);

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-6xl">
      {!propStore && (
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
      )}

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
              {/* Overview */}
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
                <div className="relative mb-6">
                  <div className="pr-16">
                    <h2 className="text-2xl md:text-3xl font-bold">
                      {store?.metadata.title}
                    </h2>
                    {/* <div className="font-mono break-all">
                      <a
                        className="text-purple-600 dark:text-purple-400 hover:underline"
                        href={uri}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {uri}
                      </a>
                    </div> */}
                  </div>
                  <div>
                    <span className="">By</span>{" "}
                    {store?.metadata.creators?.length ? (
                      <span className="space-x-2">
                        {store?.metadata.creators.map((c) => {
                          const orcidId = extractOrcidId(c.href ?? "");
                          const scienceLiveUserId = orcidId
                            ? creatorUserIdsByOrcid[orcidId]
                            : null;

                          return (
                            <span
                              key={`${c.name}-${c.href ?? ""}`}
                              className="inline-flex items-center gap-1"
                            >
                              <a
                                className="text-purple-600 dark:text-purple-400 hover:underline break-all"
                                href={
                                  c.href?.startsWith("http")
                                    ? c.href
                                    : undefined
                                }
                                target={
                                  c.href?.startsWith("http")
                                    ? "_blank"
                                    : undefined
                                }
                                rel={
                                  c.href?.startsWith("http")
                                    ? "noreferrer"
                                    : undefined
                                }
                              >
                                {c.name}
                              </a>

                              {scienceLiveUserId ? (
                                <Link
                                  to={`/user/${scienceLiveUserId}`}
                                  className="text-muted-foreground hover:text-foreground"
                                  title="View Science Live profile"
                                >
                                  <User className="h-4 w-4" />
                                </Link>
                              ) : null}
                            </span>
                          );
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  {!propStore && (
                    <div className="absolute right-0 top-0">
                      <ShareMenu uri={uri} />
                    </div>
                  )}
                </div>
                <div className="mt-1 text-sm space-y-1">
                  <div>
                    <span className="font-bold">Published:</span>{" "}
                    {store?.metadata.created ? (
                      new Date(store.metadata.created).toLocaleDateString()
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>

                  <div>
                    <span className="font-bold">Type:</span>{" "}
                    {store?.metadata.types?.length ? (
                      <span className="space-x-2">
                        {store?.metadata.types.map((c) => (
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
                            <Badge variant="secondary" className="gap-1">
                              {c.name}
                            </Badge>
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
              {!propStore && <Citation data={store?.metadata} />}
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
