/**
 * ViewCommentOnPaper
 *
 * User-friendly view for nanopubs created with the "Comment on Paper" template.
 * Displays the paper being commented on, the relation type, and the comment
 * in a clean, readable format.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { MessageSquare } from "lucide-react";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "../create/components/NanopubViewer";
import { CommentBlock, ItemTitle } from "./shared-components";

const { namedNode } = DataFactory;

// --- Comment on Paper extraction --------------------------------------

interface CommentOnPaperData {
  /** The paper URL being commented on */
  paperUrl: string;
  /** The relation type (e.g. cito:agreesWith) */
  relationType: string;
  /** The comment text */
  commentText: string;
}

function extractCommentOnPaper(store: NanopubStore): CommentOnPaperData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find the comment text (rdfs:comment)
  const commentQuad = store.matchOne(
    null,
    NS.RDFS("comment"),
    null,
    assertionGraph,
  );
  if (!commentQuad) return null;

  const commentText = commentQuad.object.value;
  const subject = commentQuad.subject.value;

  // Find the paper URL and relation type
  // The assertion has triples like: subject -> cito:relation -> paperUrl
  const allQuads = store.getQuads(
    namedNode(subject),
    null,
    null,
    assertionGraph,
  );

  let paperUrl = "";
  let relationType = "";

  for (const q of allQuads) {
    const pred = q.predicate.value;
    // Skip rdf:type, rdfs:comment, dcterms:creator
    if (
      pred === NS.RDF("type").value ||
      pred === NS.RDFS("comment").value ||
      pred === NS.DCT("creator").value
    ) {
      continue;
    }
    // The remaining named-node object should be the paper URL
    if (Util.isNamedNode(q.object)) {
      // Skip if it's a template placeholder URI
      if (q.object.value.includes("w3id.org/np/o/ntemplate/")) continue;
      paperUrl = q.object.value;
      relationType = pred;
    }
  }

  if (!paperUrl) return null;

  return { paperUrl, relationType, commentText };
}

export function ViewCommentOnPaper({ store }: CustomViewerProps) {
  const data = useMemo(() => extractCommentOnPaper(store), [store]);

  const { getLabel } = useLabels(store.labelCache);

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-sky-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-sky-600" />
          Comment on Paper
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Paper Reference */}
        <div>
          {/* Relation Type */}
          <div>
            <ItemTitle title="This Nanopublication" />
            <Badge variant="outline" className="text-sm">
              {store.findInternalLabel(data.relationType) ||
                getLabel(data.relationType)}
            </Badge>
          </div>

          {/* Paper Link - styled inline with badge */}
          <div className="flex items-center gap-2 mt-2">
            <a
              href={data.paperUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 break-all"
            >
              {getLabel(data.paperUrl)}
            </a>
          </div>
        </div>

        {/* Comment Text */}
        <CommentBlock text={data.commentText} />
      </CardContent>
    </Card>
  );
}
