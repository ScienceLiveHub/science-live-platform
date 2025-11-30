import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PREFIXES,
  extractGraphUris,
  extractMetadata,
  groupByGraph,
  loadNanopub,
  shrinkUri,
  Statement,
  Store,
  termToDisplay,
} from "@/lib/rdf";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { File } from "lucide-react";
import { useParams } from "react-router-dom";

/**
 * ViewNanopub
 * - Downloads a nanopublication
 * - Parses it with rdflib.js
 * - Displays graphs (Head, Assertion, Provenance, PubInfo) and triples in a readable format
 *
 * Intended for generic viewing of any nanopub content.
 * If the nanopub uses a supported Science Live template, then it should render a template-specific view instead.
 */

const DEFAULT_URI =
  "http://w3id.org/np/RAWcbb3lRQZNYrCYo1uUfxHF1p6apBUW9hTeJRoHrqYZQ";

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
  st,
  prefixes,
}: {
  st: Statement;
  prefixes: Record<string, string>;
}) {
  const s = termToDisplay(st.subject, prefixes);
  const p = termToDisplay(st.predicate, prefixes);
  const o = termToDisplay(st.object, prefixes);

  return (
    <tr className="border-b last:border-b-0">
      <TripleCell display={s} className="pr-3" />
      <TripleCell display={p} className="px-3 text-muted-foreground" />
      <TripleCell display={o} className="pl-3" />
    </tr>
  );
}

function GraphSection({
  title,
  statements,
  prefixes,
  extraClasses,
}: {
  title: string;
  statements: Statement[];
  prefixes: Record<string, string>;
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
          <File className="h-5 w-5 text-primary" />
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
              <TripleRow key={idx} st={st} prefixes={prefixes} />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function ViewNanopub() {
  const params = useParams();
  const uri = params.uri
    ? params.uri.startsWith("http")
      ? params.uri
      : `https://w3id.org/np/${params.uri}`
    : DEFAULT_URI;

  const [inputUri, setInputUri] = useState(uri);
  const [currentUri, setCurrentUri] = useState(uri);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);

  // Derived info
  const prefixes = useMemo(() => DEFAULT_PREFIXES, []);
  prefixes.this = inputUri;
  const allStatements = useMemo<Statement[]>(
    () =>
      store
        ? (store.match(
            undefined,
            undefined,
            undefined,
            undefined
          ) as Statement[])
        : [],
    [store]
  );
  const graphsMap = useMemo(() => groupByGraph(allStatements), [allStatements]);

  const graphUris = useMemo(
    () => (store ? extractGraphUris(store) : {}),
    [store]
  );
  const metadata = useMemo(
    () => (store ? extractMetadata(store, graphUris) : {}),
    [store, graphUris]
  );

  const headStatements = useMemo(() => {
    if (!graphUris.head) return [];
    return graphsMap.get(graphUris.head) || [];
  }, [graphsMap, graphUris]);

  const assertionStatements = useMemo(() => {
    if (!graphUris.assertion) return [];
    return graphsMap.get(graphUris.assertion) || [];
  }, [graphsMap, graphUris]);

  const provenanceStatements = useMemo(() => {
    if (!graphUris.provenance) return [];
    return graphsMap.get(graphUris.provenance) || [];
  }, [graphsMap, graphUris]);

  const pubinfoStatements = useMemo(() => {
    if (!graphUris.pubinfo) return [];
    return graphsMap.get(graphUris.pubinfo) || [];
  }, [graphsMap, graphUris]);

  const loadNanopubUri = (uri: string) => {
    setError(null);
    setLoading(true);

    loadNanopub(uri, (st: any) => {
      setStore(st);
      //TODO: update browser URL based on new URI
      setCurrentUri(inputUri);
      setLoading(false);
    }).catch((e: any) => {
      console.error("Failed to load/parse nanopublication:", e);
      setError(e?.message || "Failed to load/parse nanopublication.");
      setStore(null);
    });
  };

  useEffect(() => {
    // Auto-load default on mount
    loadNanopubUri(inputUri);
  }, []);

  const totalTriples = allStatements.length;

  const otherGraphs = useMemo(() => {
    // Exclude known graphs
    const known = new Set(
      [
        graphUris.head,
        graphUris.assertion,
        graphUris.provenance,
        graphUris.pubinfo,
      ].filter(Boolean) as string[]
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
  }, [graphsMap, graphUris]);

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold">
          Nanopublication Viewer
        </h1>
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
            disabled={loading || !inputUri}
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

      {!loading && !error && (
        <>
          {/* Overview */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            <CardTitle className="mb-2 text-muted-foreground">
              Document URI
            </CardTitle>
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

            <CardTitle className="mt-4 mb-2 text-muted-foreground">
              Summary
            </CardTitle>
            <div className="mt-1 text-sm space-y-1">
              <div>
                Total triples: <strong>{totalTriples}</strong>
              </div>
              <div>
                Type:{" "}
                {metadata.types?.length ? (
                  metadata.types.map((t) => (
                    <code key={t} className="mr-1">
                      {shrinkUri(t, prefixes)}
                    </code>
                  ))
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div>
                Created:{" "}
                {metadata.created || (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div>
                Creator(s):{" "}
                {metadata.creators?.length ? (
                  <span className="space-x-2">
                    {metadata.creators.map((c) => (
                      <a
                        key={c}
                        className="text-blue-300 hover:underline break-all"
                        href={c.startsWith("http") ? c : undefined}
                        target={c.startsWith("http") ? "_blank" : undefined}
                        rel={c.startsWith("http") ? "noreferrer" : undefined}
                      >
                        {c}
                      </a>
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Sections */}
          <section className="space-y-4">
            <GraphSection
              title="Assertion"
              statements={assertionStatements}
              prefixes={prefixes}
              extraClasses="border-l-8 border-l-yellow-300"
            />

            <GraphSection
              title="Provenance"
              statements={provenanceStatements}
              prefixes={prefixes}
              extraClasses="border-l-8 border-l-purple-600"
            />

            <GraphSection
              title="Publication Info"
              statements={pubinfoStatements}
              prefixes={prefixes}
              extraClasses="border-l-8 border-l-blue-800"
            />

            {otherGraphs.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">Other Graphs</h2>
                {otherGraphs.map((g) => (
                  <GraphSection
                    key={g.uri}
                    title={`Graph: ${shrinkUri(g.uri, prefixes)}`}
                    statements={g.statements}
                    prefixes={prefixes}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
