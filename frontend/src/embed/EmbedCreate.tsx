/**
 * EmbedCreate
 *
 * Embeddable creation form: a template's Science Live form, without the app shell and
 * without signing in. The answers go to a signing service run by the embedding
 * organization (see agent-submission.ts), which publishes them with a software agent's
 * key, so people without an account or an ORCID can contribute.
 *
 * Query params (plus the style params EmbedLayout reads):
 *   ?template=<template-uri>  - Required. A template with an agent submission mapping.
 *   ?service=<url>            - Required. The signing service to post the answers to.
 *   ?title=false              - Hide the template's title and description.
 *   ?example=true             - Test mode: everything is published as an example
 *                               (npx:ExampleNanopub), whatever the form says.
 *
 * When a nanopub is published the page tells its parent:
 *   { type: "nanopub-embed-published", uri, template }
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TEMPLATE_COMPONENTS } from "@/pages/np/create/components/templates/component-registry";
import { TEMPLATE_METADATA } from "@/pages/np/create/components/templates/registry-metadata";
import { CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AGENT_SUBMISSIONS,
  parseServiceUrl,
  submitToService,
} from "./agent-submission";
import { useEmbed } from "./EmbedContext";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950 p-4 text-yellow-900 dark:text-yellow-100">
      {children}
    </div>
  );
}

export function EmbedCreate() {
  const [searchParams] = useSearchParams();
  const { platformUrl } = useEmbed();
  const template = searchParams.get("template") || "";
  const service = useMemo(
    () => parseServiceUrl(searchParams.get("service")),
    [searchParams],
  );
  const showTitle = searchParams.get("title") !== "false";
  const testMode = searchParams.get("example") === "true";

  const [published, setPublished] = useState<{
    uri: string | null;
    example: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Remounting the form clears it for the next contribution
  const [round, setRound] = useState(0);

  const Form = TEMPLATE_COMPONENTS[template];
  const toBody = AGENT_SUBMISSIONS[template];
  const meta = TEMPLATE_METADATA[template];

  if (!template || !Form || !toBody) {
    return (
      <Notice>
        This form cannot be embedded: <code>template</code> must name a template
        that can be submitted to a publishing service.
      </Notice>
    );
  }
  if (!service) {
    return (
      <Notice>
        Missing or invalid <code>service</code> parameter: the https address of
        the service that publishes what this form collects.
      </Notice>
    );
  }

  const submit = async (values: Record<string, string | object>) => {
    setError(null);
    try {
      const body = toBody(values);
      if (testMode) body.example = true;
      const answer = await submitToService(service, body);
      const result = {
        uri: answer.uri ?? null,
        example: body.example === true,
      };
      setPublished(result);
      window.parent.postMessage(
        { type: "nanopub-embed-published", uri: result.uri, template },
        "*",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (published) {
    const viewUrl =
      published.uri &&
      `${platformUrl}/np/?uri=${encodeURIComponent(published.uri)}`;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Thank you, it is published
            {published.example && " (as an example)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {viewUrl ? (
            <p className="text-sm">
              Its permanent address:{" "}
              <a
                href={viewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-link hover:underline break-all"
              >
                {published.uri}
              </a>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              The service did not return its address.
            </p>
          )}
          <Button
            onClick={() => {
              setPublished(null);
              setRound((r) => r + 1);
            }}
          >
            Add another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && meta && (
        <CardHeader>
          <CardTitle className="text-lg">{meta.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {testMode && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950 p-3 text-sm text-yellow-900 dark:text-yellow-100">
            Test mode: what you submit is published as an example, so it is not
            mistaken for a real contribution.
          </div>
        )}
        <Form key={round} submit={submit} />
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-900 dark:text-red-100">
            Not published: {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
