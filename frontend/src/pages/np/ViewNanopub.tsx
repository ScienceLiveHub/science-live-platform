import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ItemSeparator } from "@/components/ui/item";
import {
  Snippet,
  SnippetCopyButton,
  SnippetHeader,
  SnippetTabsContent,
  SnippetTabsList,
  SnippetTabsTrigger,
} from "@/components/ui/shadcn-io/snippet";
import { Spinner } from "@/components/ui/spinner";
import {
  DEFAULT_PREFIXES,
  groupByGraph,
  shrinkUri,
  Statement,
  Util,
} from "@/lib/rdf";
import { NanopubStore } from "@/lib/store";
import { citationTypes, generateCitation } from "@/lib/utils";
import {
  ChevronsUpDown,
  Copy,
  Download,
  ExternalLink,
  File,
  LucideIcon,
  Microscope,
  Quote,
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

function TripleCell({
  display,
  className,
}: {
  display: { text: string; href?: string };
  className?: string;
}) {
  return (
    <td
      className={`py-2 align-top font-mono text-sm wrap-break-word max-w-0 ${className || ""}`}
    >
      {display.href ? (
        <a
          className="text-blue-600 dark:text-blue-300 hover:underline"
          href={display.href}
          target="_blank"
          rel="noreferrer"
        >
          {display.text}
        </a>
      ) : (
        display.text
      )}
    </td>
  );
}

function TripleRow({
  store,
  st,
  excludeSub,
}: {
  store: NanopubStore;
  st: Statement;
  excludeSub?: boolean;
}) {
  const s = {
    text: store.fetchLabel(st.subject.value as string),
    href: st.subject.value,
  };
  const p = {
    text: store.fetchLabel(st.predicate.value as string),
    href: st.predicate.value,
  };
  const o = Util.isLiteral(st.object)
    ? { text: st.object.value }
    : {
        text: store.fetchLabel(st.object.value as string),
        href: st.object.value,
      };

  return (
    <tr className="border-b last:border-b-0">
      {!excludeSub && <TripleCell display={s} className="pr-3" />}
      <TripleCell display={p} className="px-3 text-muted-foreground" />
      <TripleCell display={o} className="pl-3" />
    </tr>
  );
}

function GraphSection({
  store,
  title,
  statements,
  Icon = File,
  extraClasses,
}: {
  store: NanopubStore;
  title: string;
  statements: Statement[];
  Icon: LucideIcon;
  extraClasses?: string;
}) {
  return (
    <Card
      className={
        "hover:shadow-md transition-shadow cursor-pointer m-0 " + extraClasses
      }
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-left">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 pl-4">Subject</th>
              <th className="py-2 px-3">Predicate</th>
              <th className="py-2 pl-3 pr-4">Object</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {statements.map((st, idx) => (
              <TripleRow store={store} key={idx} st={st} />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function CollapsibleGraphSection({
  store,
  title,
  statements,
  Icon = File,
  extraClasses,
}: {
  store: NanopubStore;
  title: string;
  statements: Statement[];
  Icon: LucideIcon;
  extraClasses?: string;
}) {
  const pubStatements: Statement[] = [];
  const sigStatements: Statement[] = [];
  const otherStatements: Statement[] = [];

  statements.forEach((st) => {
    const sub = st.subject.value;
    if (sub === store.prefixes["this"]) {
      pubStatements.push(st);
    } else if (
      sub === store.prefixes["this"] + "/sig" ||
      sub === store.prefixes["this"] + "#sig"
    ) {
      sigStatements.push(st);
    } else {
      otherStatements.push(st);
    }
  });

  return (
    <Card
      className={
        "hover:shadow-md transition-shadow cursor-pointer m-0 " + extraClasses
      }
    >
      <Collapsible>
        <CardHeader>
          <CollapsibleTrigger>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              {title}{" "}
              <Button variant="ghost" size="icon" className="size-8">
                <ChevronsUpDown />
                <span className="sr-only">Toggle</span>
              </Button>
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <Card
              className={"hover:shadow-md transition-shadow cursor-pointer m-3"}
            >
              <CardContent>
                <p className="mb-2 font-medium">This Nanopublication...</p>
                <table className="w-full table-fixed text-left">
                  <colgroup>
                    <col className="w-1/2" />
                    <col className="w-1/2" />
                  </colgroup>
                  <tbody className="divide-y">
                    {pubStatements.map((st, idx) => (
                      <TripleRow store={store} key={idx} st={st} excludeSub />
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card
              className={"hover:shadow-md transition-shadow cursor-pointer m-3"}
            >
              <CardContent>
                <p className="mb-2 font-medium">Signature...</p>
                <table className="w-full table-fixed text-left">
                  <colgroup>
                    <col className="w-1/2" />
                    <col className="w-1/2" />
                  </colgroup>
                  <tbody className="divide-y">
                    {sigStatements.map((st, idx) => (
                      <TripleRow store={store} key={idx} st={st} excludeSub />
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <CardContent>
              <p className="mb-4 mt-4 font-medium">Other info</p>
              <table className="w-full text-left">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 pl-4">Subject</th>
                    <th className="py-2 px-3">Predicate</th>
                    <th className="py-2 pl-3 pr-4">Object</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {otherStatements.map((st, idx) => (
                    <TripleRow store={store} key={idx} st={st} />
                  ))}
                </tbody>
              </table>
            </CardContent>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

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
  const uri = params.uri
    ? params.uri.startsWith("http")
      ? params.uri
      : // TODO: this could be something other than w3id.org/np e.g. purl/ or w3id.org/sciencelive etc
        // we whould probably switch to a query string or have that as an alternative
        `https://w3id.org/np/${params.uri}`
    : "";

  const [inputUri, setInputUri] = useState(uri);
  const [currentUri, setCurrentUri] = useState(uri);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<NanopubStore | null>(null);

  const [selectedCite, setSelectedCite] = useState("apa");
  const prefixes = useMemo(() => DEFAULT_PREFIXES, []);

  // Derived info
  prefixes.this = currentUri;
  const allStatements = useMemo<Statement[]>(
    () =>
      store
        ? store.match(undefined, undefined, undefined, undefined)?.toArray()
        : [],
    [store],
  );
  const graphsMap = useMemo(() => groupByGraph(allStatements), [allStatements]);

  // const headStatements = useMemo(() => {
  //   if (!store?.graphUris.head) return [];
  //   return graphsMap.get(store?.graphUris.head) || [];
  // }, [graphsMap, store?.graphUris]);

  const assertionStatements = useMemo(() => {
    if (!store?.graphUris.assertion) return [];
    return graphsMap.get(store?.graphUris.assertion) || [];
  }, [graphsMap, store?.graphUris]);

  const provenanceStatements = useMemo(() => {
    if (!store?.graphUris.provenance) return [];
    return graphsMap.get(store?.graphUris.provenance) || [];
  }, [graphsMap, store?.graphUris]);

  const pubinfoStatements = useMemo(() => {
    if (!store?.graphUris.pubinfo) return [];
    return graphsMap.get(store?.graphUris.pubinfo) || [];
  }, [graphsMap, store?.graphUris]);

  const loadNanopubUri = (newUri?: string) => {
    if (!newUri) return;
    setError(null);
    setLoading(true);

    NanopubStore.loadNanopub(newUri, (st: NanopubStore) => {
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
    for (const [uri, sts] of graphsMap.entries()) {
      if (!known.has(uri)) {
        entries.push({ uri, statements: sts });
      }
    }
    // Sort by size desc
    entries.sort((a, b) => b.statements.length - a.statements.length);
    return entries;
  }, [graphsMap, store?.graphUris]);

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl text-muted-foreground">VIEW NANOPUBLICATION</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <Input
            type="text"
            className="flex-1 md:w-[520px]"
            placeholder="Enter URI e.g. https://w3id.org/np/... or http://purl.org/nanopub/..."
            value={inputUri}
            onChange={(e) => setInputUri(e.target.value)}
          />
          <button
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            disabled={loading}
            onClick={() => loadNanopubUri(inputUri)}
          >
            Load
          </button>
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
                        className="text-purple-500 hover:underline"
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

              <Snippet onValueChange={setSelectedCite} value={selectedCite}>
                <CardTitle className="m-4 text-muted-foreground items-center flex gap-2">
                  <Quote />
                  Cite Nanopublication
                </CardTitle>
                <SnippetHeader>
                  <SnippetTabsList>
                    {Object.entries(citationTypes).map(([k, c]) => (
                      <SnippetTabsTrigger key={k} value={k}>
                        <c.icon size={14} />
                        <span>{c.label}</span>
                      </SnippetTabsTrigger>
                    ))}
                  </SnippetTabsList>
                  {selectedCite && (
                    <SnippetCopyButton
                      onCopy={() => console.log(`Copied to clipboard`)}
                      onError={() =>
                        console.error(`Failed to copy to clipboard`)
                      }
                      value={generateCitation(store?.metadata, selectedCite)}
                    />
                  )}
                </SnippetHeader>
                <SnippetTabsContent key={selectedCite} value={selectedCite}>
                  {generateCitation(store?.metadata, selectedCite)}
                </SnippetTabsContent>
              </Snippet>

              {/* Sections */}
              <section className="space-y-4">
                <GraphSection
                  store={store!}
                  title="Assertion"
                  statements={assertionStatements}
                  Icon={File}
                  extraClasses="border-l-8 border-l-yellow-300"
                />

                <GraphSection
                  store={store!}
                  title="Provenance"
                  statements={provenanceStatements}
                  Icon={Microscope}
                  extraClasses="border-l-8 border-l-purple-600"
                />

                <CollapsibleGraphSection
                  store={store!}
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
                        store={store!}
                        key={g.uri}
                        title={`Graph: ${shrinkUri(g.uri, store!.prefixes)}`}
                        statements={g.statements}
                        Icon={File}
                        extraClasses="border-l-8 border-l-purple-600"
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
