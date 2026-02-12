/**
 * ViewAnnotateQuotation
 *
 * User-friendly view for nanopubs created with the "Annotate a Paper Quotation" template.
 * Displays the paper being quoted, the quotation text, and the user's
 * comment/interpretation in a clean, readable format.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { ExternalLink, Link2, MessageCircle, Quote } from "lucide-react";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import { CustomViewerProps, NanopubViewShell } from "./NanopubViewShell";

const { namedNode } = DataFactory;

// --- Annotate a Paper Quotation extraction ----------------------------

interface AnnotateQuotationData {
  /** The paper DOI/URL being quoted */
  paperUrl: string;
  /** The quoted text from the paper */
  quotedText: string;
  /** Optional end of quotation (for start/end quoting) */
  quotedTextEnd?: string;
  /** The user's comment/interpretation */
  commentText: string;
}

function extractAnnotateQuotation(
  store: NanopubStore,
): AnnotateQuotationData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find the quoted text
  const quotedTextQuad = store.matchOne(
    null,
    NS.CITO("hasQuotedText"),
    null,
    assertionGraph,
  );

  // Also check for cito:includesQuotationFrom
  const includesQuotationQuad = store.matchOne(
    null,
    NS.CITO("includesQuotationFrom"),
    null,
    assertionGraph,
  );

  // Find the comment
  const commentQuad = store.matchOne(
    null,
    NS.RDFS("comment"),
    null,
    assertionGraph,
  );

  // Find the paper URL from cito:quotes predicate
  const quotesQuad = store.matchOne(
    null,
    NS.CITO("quotes"),
    null,
    assertionGraph,
  );

  // The paper URL could be the subject of hasQuotedText or the object of cito:quotes
  let paperUrl = "";
  if (quotesQuad && Util.isNamedNode(quotesQuad.object)) {
    paperUrl = quotesQuad.object.value;
  } else if (quotedTextQuad && Util.isNamedNode(quotedTextQuad.subject)) {
    paperUrl = quotedTextQuad.subject.value;
  } else if (
    includesQuotationQuad &&
    Util.isNamedNode(includesQuotationQuad.object)
  ) {
    paperUrl = includesQuotationQuad.object.value;
  }

  const quotedText = quotedTextQuad?.object.value ?? "";
  const commentText = commentQuad?.object.value ?? "";

  if (!paperUrl && !quotedText) return null;

  return { paperUrl, quotedText, commentText };
}

function QuotationContent({
  data,
  store,
}: {
  data: AnnotateQuotationData;
  store: NanopubStore;
}) {
  const { getLabel } = useLabels(store.labelCache);

  return (
    <Card className="border-l-8 border-l-rose-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Quote className="h-5 w-5 text-rose-600" />
          Paper Quotation &amp; Annotation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Paper Reference */}
        {data.paperUrl && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Paper
            </p>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={data.paperUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 break-all"
              >
                {getLabel(data.paperUrl)}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          </div>
        )}

        {/* Quotation */}
        {data.quotedText && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Quotation
            </p>
            <blockquote className="rounded-md border-l-4 border-rose-300 bg-rose-50 dark:bg-rose-950/20 p-4 text-base leading-relaxed">
              <Quote className="h-4 w-4 text-rose-400 mb-1 inline-block mr-1" />
              <span className="italic">{data.quotedText}</span>
              {data.quotedTextEnd && (
                <>
                  <span className="mx-2 text-muted-foreground">…</span>
                  <span className="italic">{data.quotedTextEnd}</span>
                </>
              )}
            </blockquote>
          </div>
        )}

        {/* Comment / Interpretation */}
        {data.commentText && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              <MessageCircle className="h-4 w-4 inline-block mr-1" />
              Interpretation / Comment
            </p>
            <div className="rounded-md border bg-muted/30 p-4 text-base leading-relaxed">
              {data.commentText}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ViewAnnotateQuotation({
  store,
  creatorUserIdsByOrcid,
}: CustomViewerProps) {
  const data = useMemo(() => extractAnnotateQuotation(store), [store]);

  if (!data) return null;

  return (
    <NanopubViewShell
      store={store}
      creatorUserIdsByOrcid={creatorUserIdsByOrcid}
    >
      <QuotationContent data={data} store={store} />
    </NanopubViewShell>
  );
}
