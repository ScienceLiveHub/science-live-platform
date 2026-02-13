/**
 * ViewCitationWithCiTO
 *
 * User-friendly view for nanopubs created with the "Citation with CiTO" template.
 * Displays the citing article and a list of citations with their relation types
 * in a clean, readable format.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { ArrowRight, BookOpen, ExternalLink, Link2 } from "lucide-react";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "../create/components/NanopubViewer";

const { namedNode } = DataFactory;

const FABIO_SCHOLARLY_WORK = "http://purl.org/spar/fabio/ScholarlyWork";

// --- Citation with CiTO extraction ------------------------------------

interface CitationWithCiTOData {
  /** The citing article DOI/URL */
  citingArticle: string;
  /** Array of citations: each has a relation type URI and a cited article URL */
  citations: { relationType: string; citedArticle: string }[];
}

function extractCitationWithCiTO(
  store: NanopubStore,
): CitationWithCiTOData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find the citing article: the subject that is a fabio:ScholarlyWork
  const scholarlyWorkQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(FABIO_SCHOLARLY_WORK),
    assertionGraph,
  );

  if (!scholarlyWorkQuad) return null;

  const citingArticle = scholarlyWorkQuad.subject.value;

  // Find all citation triples: subject = citingArticle, predicate = cito:*
  // (excluding rdf:type)
  const allQuads = store.getQuads(
    namedNode(citingArticle),
    null,
    null,
    assertionGraph,
  );

  const citations: { relationType: string; citedArticle: string }[] = [];
  for (const q of allQuads) {
    if (q.predicate.value === NS.RDF("type").value) continue;
    if (Util.isNamedNode(q.object)) {
      citations.push({
        relationType: q.predicate.value,
        citedArticle: q.object.value,
      });
    }
  }

  return { citingArticle, citations };
}

function UriLink({ uri, label }: { uri: string; label?: string }) {
  return (
    <a
      href={uri}
      target="_blank"
      rel="noreferrer"
      className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 break-all"
    >
      {label || uri}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

export function ViewCitationWithCiTO({ store }: CustomViewerProps) {
  const data = useMemo(() => extractCitationWithCiTO(store), [store]);

  const { getLabel } = useLabels(store.labelCache);

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-amber-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-amber-600" />
          Citations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Citing Article */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            This Article
          </p>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <UriLink
              uri={data.citingArticle}
              label={getLabel(data.citingArticle)}
            />
          </div>
        </div>

        {/* Citations List */}
        {data.citations.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              cites the following:
            </p>
            <div className="space-y-3">
              {data.citations.map((citation, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-md border bg-muted/30 p-3"
                >
                  <ArrowRight className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <a
                      href={citation.relationType}
                      target="_blank"
                      rel="noreferrer"
                      className="no-underline"
                    >
                      <Badge variant="outline" className="text-xs">
                        {store.findInternalLabel(citation.relationType) ||
                          getLabel(citation.relationType)}
                      </Badge>
                    </a>
                    <div>
                      <UriLink
                        uri={citation.citedArticle}
                        label={getLabel(citation.citedArticle)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
