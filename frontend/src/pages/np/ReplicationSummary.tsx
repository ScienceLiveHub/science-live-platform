import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  fetchReplications,
  isConfirmed,
  isContradicted,
  isPartial,
  type Replication,
  type ReplicationSummary as Summary,
} from "@/lib/replications";
import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileBadge,
  HelpCircle,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const VIEWER = "https://platform.sciencelive4all.org/np/?uri=";

function VerdictIcon({ verdict }: { verdict: string }) {
  if (isContradicted(verdict))
    return <XCircle className="size-4 text-red-600" aria-hidden />;
  if (isPartial(verdict))
    return <CircleAlert className="size-4 text-amber-600" aria-hidden />;
  if (isConfirmed(verdict))
    return <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />;
  return <HelpCircle className="size-4 text-muted-foreground" aria-hidden />;
}

/** A labelled paragraph in the per-replication detail, only when there is content. */
function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed">{value}</p>
    </div>
  );
}

function ReplicationCard({ rep }: { rep: Replication }) {
  const repoHref = rep.repo
    ? rep.repo.startsWith("http")
      ? rep.repo
      : `https://doi.org/${rep.repo}`
    : null;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            {rep.study.label || "Replication study"}
          </CardTitle>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <VerdictIcon verdict={rep.verdict} />
            {rep.verdict || "Outcome"}
          </span>
        </div>
        {rep.confidence && (
          <CardDescription>
            Confidence: {rep.confidence.replace(/([a-z])([A-Z])/g, "$1 $2")}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="What held up / didn't" value={rep.conclusion} />
        {(rep.study.scope || rep.study.method || rep.study.deviation) && (
          <Accordion type="single" collapsible>
            <AccordionItem value="how" className="border-b-0">
              <AccordionTrigger className="py-2 text-sm">
                How it was replicated
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-1">
                <Field label="Scope" value={rep.study.scope} />
                <Field label="Methodology" value={rep.study.method} />
                <Field
                  label="Deviations from the original"
                  value={rep.study.deviation}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <a
            className="inline-flex items-center gap-1 text-primary hover:underline"
            href={`${VIEWER}${encodeURIComponent(rep.outcomeNp)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileBadge className="size-3.5" />
            Signed replication outcome
          </a>
          {repoHref && (
            <a
              className="inline-flex items-center gap-1 text-primary hover:underline"
              href={repoHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-3.5" />
              Replication materials
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Group replications by the claim they tested — a paper may have several claims. */
function groupByClaim(reps: Replication[]) {
  const groups = new Map<
    string,
    { claim: Replication["claim"]; reps: Replication[] }
  >();
  for (const r of reps) {
    const key = r.claim.aida || r.claim.label || r.claim.uri || "—";
    const g = groups.get(key) ?? { claim: r.claim, reps: [] };
    g.reps.push(r);
    groups.set(key, g);
  }
  return [...groups.values()];
}

export default function ReplicationSummary() {
  const [searchParams] = useSearchParams();
  const doi = (searchParams.get("doi") || "").trim();

  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doi) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);
    fetchReplications(doi, ac.signal)
      .then((d) => {
        if (!ac.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError(e?.message || String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [doi]);

  const groups = data ? groupByClaim(data.replications) : [];

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:max-w-4xl md:p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Independent replications
        </h1>
        {doi ? (
          <p className="text-muted-foreground">
            Every signed replication of{" "}
            <a
              className="text-primary hover:underline"
              href={`https://doi.org/${doi}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {doi}
            </a>{" "}
            on the nanopub network, with the verdict each reached.
            Author-agnostic, retraction-aware, read live from the public
            network.
          </p>
        ) : (
          <p className="text-muted-foreground">
            Add a <code>?doi=</code> parameter, e.g.{" "}
            <code>/np/replications?doi=10.1126/science.aax8591</code>.
          </p>
        )}
      </header>

      {loading && (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Spinner /> Searching the nanopub network…
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      )}

      {data && !loading && data.count === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No independent replications of this paper have been recorded on the
            nanopub network yet.
          </CardContent>
        </Card>
      )}

      {data && data.count > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {data.count} replication{data.count === 1 ? "" : "s"}
            </Badge>
            {data.byVerdict.validated > 0 && (
              <span className="inline-flex items-center gap-1 text-sm">
                <CheckCircle2 className="size-4 text-emerald-600" />
                {data.byVerdict.validated} confirmed
              </span>
            )}
            {data.byVerdict.partial > 0 && (
              <span className="inline-flex items-center gap-1 text-sm">
                <CircleAlert className="size-4 text-amber-600" />
                {data.byVerdict.partial} partial
              </span>
            )}
            {data.byVerdict.contradicted > 0 && (
              <span className="inline-flex items-center gap-1 text-sm">
                <XCircle className="size-4 text-red-600" />
                {data.byVerdict.contradicted} contradicted
              </span>
            )}
          </div>

          {groups.map((g, i) => (
            <section key={i} className="space-y-3">
              <Separator />
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Claim tested
                  {g.claim.type ? ` · ${g.claim.type}` : ""}
                </div>
                <p className="text-lg font-medium leading-snug">
                  {g.claim.aida || g.claim.label || "—"}
                </p>
              </div>
              <div className="grid gap-3">
                {g.reps.map((r) => (
                  <ReplicationCard key={r.outcomeNp} rep={r} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
