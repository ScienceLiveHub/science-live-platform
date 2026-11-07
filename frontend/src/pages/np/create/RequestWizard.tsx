import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loadSigningProfile, type UserIdentity } from "@/lib/api-utils";
import { authClient } from "@/lib/auth-client";
import { fetchQuotesForDoi, normaliseDoi, type PaperQuote } from "@/lib/quotes";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import NanopubEditor from "./components/NanopubEditor";
import { TEMPLATE_URI } from "./components/templates/registry-metadata";
import CreateModeTabs from "./CreateModeTabs";

/**
 * "Request a replication" — ask for a claim to be independently reproduced or
 * replicated. A request (template `RAo1X8qf…`) points to a Quote-with-comment
 * nanopub: the quotation states the claim, the comment says why it matters. So the
 * wizard first finds the quotes that already exist for the paper (reuse one, and
 * several people asking for the same quote shows demand), or lets the user write a
 * new quote; then it opens the request form pre-filled with that quote.
 *
 * Deep-links: `/np/create/request?doi=10.xxxx/…` (start from a paper, e.g. from the
 * Replication Radar) or `/np/create/request?quote=<quote nanopub URI>` (skip to the
 * request form).
 */

type Step = "choose" | "new-quote" | "request";

export default function RequestWizard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const doiParam = searchParams.get("doi") ?? "";
  const quoteParam = searchParams.get("quote");

  const [doiInput, setDoiInput] = useState(doiParam);
  // Result of the last quote lookup, keyed by the DOI it was for, so "loading" is
  // derived (doi set, result not yet for that doi) rather than set inside the effect.
  const [lookup, setLookup] = useState<{
    doi: string;
    quotes: PaperQuote[] | null;
    error: string | null;
  } | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(quoteParam ? "request" : "choose");
  const [quoteUri, setQuoteUri] = useState<string | null>(quoteParam);
  const [publishedUri, setPublishedUri] = useState<string | null>(null);
  const [signingProfile, setSigningProfile] = useState<UserIdentity | null>(
    null,
  );
  const { data: session, isPending } = authClient.useSession();

  const doi = normaliseDoi(doiParam);
  const loading = !!doi && lookup?.doi !== doi;
  const quotes = lookup?.doi === doi ? lookup.quotes : null;
  const error = inputError ?? (lookup?.doi === doi ? lookup.error : null);

  // Load the signing profile once a session is available (mirrors CreateNanopub).
  useEffect(() => {
    if (isPending || !session?.user) return;
    loadSigningProfile(setSigningProfile);
  }, [session, isPending]);

  // Find existing quotes whenever the ?doi= parameter changes.
  useEffect(() => {
    if (!doi) return;
    const controller = new AbortController();
    fetchQuotesForDoi(doi, controller.signal)
      .then((q) => setLookup({ doi, quotes: q, error: null }))
      .catch((e) => {
        if (controller.signal.aborted) return;
        setLookup({
          doi,
          quotes: null,
          error: `Could not look up quotes for this paper (${e?.message ?? e}). You can still write a new quote.`,
        });
      });
    return () => controller.abort();
  }, [doi]);

  const identityPending =
    isPending || (!isPending && !!session?.user && !signingProfile);

  const lookUp = () => {
    const clean = normaliseDoi(doiInput);
    if (!clean) {
      setInputError(
        `"${doiInput}" is not a DOI. It should look like 10.1038/s41586-024-08106-4.`,
      );
      return;
    }
    setInputError(null);
    const next = new URLSearchParams(searchParams);
    next.set("doi", clean);
    next.delete("quote");
    setSearchParams(next);
    setStep("choose");
    setQuoteUri(null);
    setPublishedUri(null);
  };

  const chooseQuote = (uri: string) => {
    setQuoteUri(uri);
    setStep("request");
    setPublishedUri(null);
  };

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-6xl">
      <CreateModeTabs />

      {step === "choose" && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Request a replication</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-secondary-foreground">
              Ask for a claim to be independently reproduced or replicated. A
              request points to a <em>quote</em> from the paper: the quotation
              states the claim, your comment says why it matters. Requests are
              public and signed with your ORCID; anyone can take one on.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="request-doi"
                value={doiInput}
                onChange={(e) => setDoiInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookUp()}
                placeholder="Paper DOI, e.g. 10.1038/s41586-024-08106-4"
                spellCheck={false}
                aria-label="Paper DOI"
              />
              <Button onClick={lookUp} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Find quotes"
                )}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}

            {doi && !loading && (quotes || error) && (
              <div className="flex flex-col gap-3">
                {quotes && quotes.length > 0 ? (
                  <>
                    <p className="text-sm font-medium">
                      Claims already quoted from this paper. Pick the one to
                      check:
                    </p>
                    {quotes.map((q) => (
                      <div
                        key={q.np}
                        className="flex flex-col gap-2 rounded-md border p-3 text-sm"
                      >
                        <blockquote className="border-l-4 border-violet-300 pl-3 italic">
                          {q.quotation}
                        </blockquote>
                        {q.comment && (
                          <p className="text-secondary-foreground">
                            {q.comment}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {q.date && <span>{q.date.slice(0, 10)}</span>}
                          <span>
                            {q.requests === 0
                              ? "No request yet"
                              : `${q.requests} request${q.requests > 1 ? "s" : ""} already`}
                          </span>
                          <a
                            href={`/np/?uri=${encodeURIComponent(q.np)}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            View quote <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <Button
                          className="w-fit"
                          size="sm"
                          onClick={() => chooseQuote(q.np)}
                        >
                          Request a replication of this claim
                        </Button>
                      </div>
                    ))}
                  </>
                ) : quotes ? (
                  <p className="text-sm text-secondary-foreground">
                    No claim from this paper has been quoted yet.
                  </p>
                ) : null}
                <Button
                  variant="outline"
                  className="w-fit"
                  onClick={() => setStep("new-quote")}
                >
                  Quote a different claim from this paper
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === "new-quote" && (
        <>
          <Card className="max-w-3xl">
            <CardContent className="flex flex-col gap-2 pt-6 text-sm">
              <p>
                <strong>Step 1 of 2: quote the claim.</strong> Copy the sentence
                that states the claim, and say in the comment why it matters.
                After publishing, you continue to the request.
              </p>
              <Button
                variant="link"
                className="w-fit px-0"
                onClick={() => setStep("choose")}
              >
                Back to existing quotes
              </Button>
            </CardContent>
          </Card>
          <NanopubEditor
            identity={signingProfile}
            identityPending={identityPending}
            templateUri={TEMPLATE_URI.ANNOTATE_QUOTATION}
            prefilledData={doi ? { paper: doi } : {}}
            onPublished={(r) => chooseQuote(r.uri)}
            embedded={false}
            hideAdvancedToggle
          />
        </>
      )}

      {step === "request" && quoteUri && (
        <>
          {publishedUri ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-500">
                  <CheckCircle2 className="h-5 w-5" />
                  Replication request published
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <code className="break-all text-sm">{publishedUri}</code>
                <a
                  href={`/np/?uri=${encodeURIComponent(publishedUri)}`}
                  className="inline-flex w-fit items-center gap-1 text-sm text-primary hover:underline"
                >
                  View the request <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </CardContent>
            </Card>
          ) : (
            <Card className="max-w-3xl">
              <CardContent className="flex flex-col gap-2 pt-6 text-sm">
                <p>
                  <strong>Request for the claim in:</strong>{" "}
                  <a
                    href={`/np/?uri=${encodeURIComponent(quoteUri)}`}
                    className="break-all text-primary hover:underline"
                  >
                    {quoteUri}
                  </a>
                </p>
                {doi && (
                  <Button
                    variant="link"
                    className="w-fit px-0"
                    onClick={() => setStep("choose")}
                  >
                    Choose another claim
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
          <NanopubEditor
            key={quoteUri}
            identity={signingProfile}
            identityPending={identityPending}
            templateUri={TEMPLATE_URI.REPLICATION_REQUEST}
            prefilledData={{ quote: quoteUri }}
            onPublished={(r) => setPublishedUri(r.uri)}
            embedded={false}
            hideAdvancedToggle
          />
        </>
      )}
    </main>
  );
}
