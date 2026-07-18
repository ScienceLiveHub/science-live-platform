import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loadSigningProfile, type UserIdentity } from "@/lib/api-utils";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import ky from "ky";
import { CheckCircle2, Circle, Link2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import NanopubEditor from "./components/NanopubEditor";
import CreateModeTabs from "./CreateModeTabs";

/**
 * "Create FORRT Chain" — publish a whole FORRT replication chain one
 * nanopublication at a time, each pre-filled from the repository's committed
 * `chain-draft.json` (see the forrt-replication-template repo). Each step reuses
 * the existing NanopubEditor; when a step is published its URI is carried into
 * the next step's back-reference field, so the researcher never copy-pastes URIs.
 *
 * The draft is loaded by URL (usually a deep link from the repo's Jupyter Book:
 * `/np/create/chain?draft=<url>`), so producing the chain costs no LLM tokens.
 */

interface ChainDraftStep {
  step: string;
  template_key: string;
  template_uri: string;
  prefill: Record<string, unknown>;
  provenance?: Record<string, string>;
  manual?: string[];
  published_uri?: string | null;
}

interface CarryForward {
  from: string;
  into: string;
  field: string;
}

interface ChainDraft {
  schema_version: string;
  kind: string;
  chain_shape: string;
  source?: { repository?: string; commit?: string };
  steps: ChainDraftStep[];
  carry_forward: CarryForward[];
}

const STEP_TITLE: Record<string, string> = {
  "01_quote": "Quote-with-comment",
  "01_pico": "PICO research question",
  "01_pcc": "PCC research question",
  "02_aida": "AIDA sentence",
  "03_claim": "FORRT claim",
  "04_study": "Replication study",
  "05_outcome": "Replication outcome",
  "06_citation": "CiTO citation",
  "07_research_software": "Research software",
  "08_synthesis": "Research synthesis",
};

// Which prefill field holds each step's human-readable text, used to label a
// carried-in reference in the next step's search box (the sentence / the label).
const LABEL_SOURCE: Record<string, string> = {
  "02_aida": "aida",
  "03_claim": "label",
  "04_study": "label",
};

/**
 * A browser fetch of raw.githubusercontent.com is often blocked by CORS; the
 * jsDelivr GitHub mirror serves the same file with permissive CORS. Other URLs
 * (already a CDN, the GitHub Contents API, a self-hosted file) pass through.
 */
function corsSafeUrl(url: string): string {
  const m = url.match(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/,
  );
  return m
    ? `https://cdn.jsdelivr.net/gh/${m[1]}/${m[2]}@${m[3]}/${m[4]}`
    : url;
}

export default function ForrtChainWizard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const draftUrl = searchParams.get("draft");

  const [urlInput, setUrlInput] = useState(draftUrl ?? "");
  const [draft, setDraft] = useState<ChainDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [publishedUris, setPublishedUris] = useState<Record<string, string>>({});
  const [signingProfile, setSigningProfile] = useState<UserIdentity | null>(null);
  const { data: session, isPending } = authClient.useSession();

  // Load the signing profile once a session is available (mirrors CreateNanopub).
  useEffect(() => {
    if (isPending || !session?.user) return;
    loadSigningProfile(setSigningProfile);
  }, [session, isPending]);

  // Fetch the chain draft whenever the ?draft= URL changes.
  useEffect(() => {
    if (!draftUrl) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    // no-store: a chain-draft.json is edited in place (committed), so never serve
    // a cached copy — otherwise a re-generated draft loads stale.
    ky.get(corsSafeUrl(draftUrl), { cache: "no-store" })
      .json<ChainDraft>()
      .then((d) => {
        if (cancelled) return;
        setDraft(d);
        const published: Record<string, string> = {};
        d.steps.forEach((s) => {
          if (s.published_uri) published[s.step] = s.published_uri;
        });
        setPublishedUris(published);
        const firstUnpublished = d.steps.findIndex((s) => !published[s.step]);
        setStepIndex(firstUnpublished === -1 ? 0 : firstUnpublished);
      })
      .catch(async (e) => {
        if (cancelled) return;
        // Surface the real reason: an HTTP status (e.g. jsDelivr 404 for a
        // not-yet-cached commit), a CORS/network failure, or a JSON parse error.
        let detail = e?.message ?? String(e);
        const res = e?.response as Response | undefined;
        if (res) detail = `HTTP ${res.status} ${res.statusText}`.trim();
        setError(
          `Could not load a chain draft from that URL (${detail}). It should be a public chain-draft.json — a jsDelivr or raw GitHub URL.`,
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draftUrl]);

  const step = draft?.steps[stepIndex];
  const carryEdge = draft?.carry_forward.find((e) => e.into === step?.step);
  const carriedUri = carryEdge ? publishedUris[carryEdge.from] : undefined;
  // The human-readable text of each step, so a carried-in back-reference shows
  // it (the sentence / label) in the search box rather than the raw URI.
  const carriedLabel = useMemo(() => {
    if (!carryEdge) return undefined;
    const from = draft?.steps.find((s) => s.step === carryEdge.from);
    const key = LABEL_SOURCE[carryEdge.from];
    const v = from && key ? from.prefill[key] : undefined;
    return typeof v === "string" ? v : undefined;
  }, [draft, carryEdge]);

  // Pre-fill = the repo-derived values, plus the previous step's published URI
  // in this step's back-reference field. Values may be strings, arrays (repeatable
  // groups like the CiTO `st02`), or objects. A `YYYY-MM-DD` string is coerced to
  // a Date, since the date fields' pickers and onSubmit expect a Date. The carried
  // URI's field also gets a `<field>Label` companion so the search box displays the
  // referenced nanopub's text, not its URI (the template components read it).
  const prefilledData = useMemo(() => {
    if (!step) return undefined;
    const merged: Record<string, unknown> = { ...step.prefill };
    if (carryEdge && carriedUri) {
      merged[carryEdge.field] = carriedUri;
      if (carriedLabel) merged[`${carryEdge.field}Label`] = carriedLabel;
    }
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(merged)) {
      data[k] =
        typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
          ? new Date(`${v}T00:00:00`)
          : v;
    }
    return data;
  }, [step, carryEdge, carriedUri, carriedLabel]);

  const identityPending =
    isPending || (!isPending && !!session?.user && !signingProfile);
  const allPublished =
    !!draft && draft.steps.every((s) => publishedUris[s.step]);

  const loadFromInput = () => {
    const u = urlInput.trim();
    if (!u) return;
    const next = new URLSearchParams(searchParams);
    next.set("draft", u);
    setSearchParams(next);
  };

  const handlePublished = (uri: string) => {
    if (!step || !draft) return;
    setPublishedUris((prev) => ({ ...prev, [step.step]: uri }));
    setStepIndex((i) => Math.min(i + 1, draft.steps.length - 1));
  };

  const stepNumber = (stepId?: string) =>
    draft ? draft.steps.findIndex((s) => s.step === stepId) + 1 : 0;

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-6xl">
      <CreateModeTabs />

      {!draft && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Publish a FORRT replication chain</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-secondary-foreground">
              Load the <code>chain-draft.json</code> from your replication
              repository. Every nanopublication comes pre-filled — review and
              publish each in order, and each published link is carried into the
              next step for you.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadFromInput()}
                placeholder="https://github.com/OWNER/REPO/…/nanopubs/chain-draft.json"
                spellCheck={false}
                aria-label="Chain draft URL"
              />
              <Button onClick={loadFromInput} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Load chain"
                )}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Tip: link straight here from your repository — a{" "}
              <code>…/np/create/chain?draft=&lt;url&gt;</code> link opens the
              wizard already loaded.
            </p>
          </CardContent>
        </Card>
      )}

      {draft && step && (
        <>
          <div className="flex flex-wrap gap-2">
            {draft.steps.map((s, i) => {
              const done = !!publishedUris[s.step];
              const current = i === stepIndex;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setStepIndex(i)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
                    current
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border hover:bg-muted",
                    done && "text-green-600 dark:text-green-500",
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  {i + 1}. {STEP_TITLE[s.step] ?? s.step}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-secondary-foreground">
            <Badge variant="secondary">
              Step {stepIndex + 1} of {draft.steps.length}
            </Badge>
            {carryEdge &&
              (carriedUri ? (
                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-500">
                  <Link2 className="h-3.5 w-3.5" />
                  linked to step {stepNumber(carryEdge.from)}
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-500">
                  publish step {stepNumber(carryEdge.from)} first to link this one
                </span>
              ))}
            {step.manual && step.manual.length > 0 && (
              <>
                {(() => {
                  const confirm = step.manual.filter((m) => m in step.prefill);
                  const choose = step.manual.filter((m) => !(m in step.prefill));
                  return (
                    <>
                      {confirm.length > 0 && (
                        <span className="text-muted-foreground">
                          · confirm: {confirm.join(", ")}
                        </span>
                      )}
                      {choose.length > 0 && (
                        <span className="text-muted-foreground">
                          · you choose: {choose.join(", ")}
                        </span>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>

          {/* Re-key on the carried URI so the editor remounts with fresh prefill
              once the previous step publishes. */}
          <NanopubEditor
            key={`${step.step}:${carriedUri ?? ""}`}
            identity={signingProfile}
            identityPending={identityPending}
            templateUri={step.template_uri}
            prefilledData={prefilledData}
            onPublished={(r) => handlePublished(r.uri)}
            embedded={false}
          />

          {allPublished && (
            <Card>
              <CardHeader>
                <CardTitle>Chain complete</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-secondary-foreground">
                  All {draft.steps.length} nanopublications are published and
                  linked. Record these URIs in your repository's{" "}
                  <code>PUBLISHED.md</code>.
                </p>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {draft.steps.map((s, i) => (
                    <li key={s.step} className="flex flex-wrap gap-2">
                      <span className="text-muted-foreground tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-40">
                        {STEP_TITLE[s.step] ?? s.step}
                      </span>
                      <a
                        href={publishedUris[s.step]}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all font-mono text-xs text-primary hover:underline"
                      >
                        {publishedUris[s.step]}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </main>
  );
}
