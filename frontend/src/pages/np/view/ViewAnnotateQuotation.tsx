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
import { Quote } from "lucide-react";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "../create/components/NanopubViewer";
import { CommentBlock, PaperLink, QuotationBlock } from "./shared-components";

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

export function ViewAnnotateQuotation({ store }: CustomViewerProps) {
  const data = useMemo(() => extractAnnotateQuotation(store), [store]);

  const { getLabel } = useLabels(store.labelCache);

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-rose-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Quote className="h-5 w-5 text-rose-600" />
          Paper Quotation & Annotation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Paper Reference */}
        {data.paperUrl && (
          <PaperLink url={data.paperUrl} label={getLabel(data.paperUrl)} />
        )}

        {/* Quotation */}
        {data.quotedText && (
          <QuotationBlock
            text={data.quotedText}
            textEnd={data.quotedTextEnd}
            colorClass="border-rose-300"
            bgClass="bg-rose-50 dark:bg-rose-950/20"
          />
        )}

        {/* Comment / Interpretation */}
        {data.commentText && (
          <CommentBlock
            text={data.commentText}
            title="Interpretation / Comment"
          />
        )}
      </CardContent>
    </Card>
  );
}
