/**
 * ViewCitationWithCiTO
 *
 * User-friendly view for nanopubs created with the "Citation with CiTO" template.
 * Displays the citing Scholarly work and a list of citations with their relation types
 * in a clean, readable format.
 */

import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { ArrowRight, Link2 } from "lucide-react";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import {
  TEMPLATE_METADATA,
  TEMPLATE_URI,
  getTemplateBorderClass,
  getTemplateColorClass,
} from "../create/components/templates/registry-metadata";
import { CustomViewerProps } from "./NanopubViewer";
import { ExternalUriLink, ItemTitle } from "./shared-components";
import { TEMPLATE_VIEW_ICONS } from "./view-registry";

const { namedNode } = DataFactory;

// The current CiTO template types the citing work as schema:CreativeWork;
// the earlier template used fabio:ScholarlyWork. Both http:// and https://
// forms of the schema.org namespace occur in the wild.
const SCHEMA_CREATIVE_WORK_URIS = [
  "http://schema.org/CreativeWork",
  "https://schema.org/CreativeWork",
];
const FABIO_SCHOLARLY_WORK = "http://purl.org/spar/fabio/ScholarlyWork";

// --- Citation with CiTO extraction ------------------------------------

interface CitationWithCiTOData {
  /** The citing Scholarly work DOI/URL */
  citingWork: string;
  /** Array of citations: each has a relation type URI and a cited works URL */
  citations: { relationType: string; citedWork: string }[];
}

function extractCitationWithCiTO(
  store: NanopubStore,
): CitationWithCiTOData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find the citing work: the subject typed as schema:CreativeWork (current
  // template) or fabio:ScholarlyWork (legacy template version).
  const candidateTypes = [...SCHEMA_CREATIVE_WORK_URIS, FABIO_SCHOLARLY_WORK];
  let scholarlyWorkQuad: ReturnType<typeof store.matchOne> = null;
  for (const typeUri of candidateTypes) {
    scholarlyWorkQuad = store.matchOne(
      null,
      NS.RDF("type"),
      namedNode(typeUri),
      assertionGraph,
    );
    if (scholarlyWorkQuad) break;
  }

  if (!scholarlyWorkQuad) return null;

  const citingWork = scholarlyWorkQuad.subject.value;

  // Find all citation triples: subject = citingArticle, predicate = cito:*
  // (excluding rdf:type)
  const allQuads = store.getQuads(
    namedNode(citingWork),
    null,
    null,
    assertionGraph,
  );

  const citations: { relationType: string; citedWork: string }[] = [];
  for (const q of allQuads) {
    if (q.predicate.value === NS.RDF("type").value) continue;
    if (Util.isNamedNode(q.object)) {
      citations.push({
        relationType: q.predicate.value,
        citedWork: q.object.value,
      });
    }
  }

  return { citingWork, citations };
}

export function ViewCitationWithCiTO({ store }: CustomViewerProps) {
  const data = useMemo(() => extractCitationWithCiTO(store), [store]);
  const { resolvedTheme } = useTheme();

  const { getLabel } = useLabels();

  if (!data) return null;

  const Icon = TEMPLATE_VIEW_ICONS[TEMPLATE_URI.CITATION_CITO];
  const color = TEMPLATE_METADATA[TEMPLATE_URI.CITATION_CITO].color!;

  return (
    <Card
      className={`border-l-8 ${getTemplateBorderClass(color, resolvedTheme)}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon
            className={`h-5 w-5 ${getTemplateColorClass(color, resolvedTheme)}`}
          />
          Citations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Citing Work */}
        <div>
          <ItemTitle title="The Creative or Scholarly work" />
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <ExternalUriLink
              uri={data.citingWork}
              label={getLabel(data.citingWork)}
            />
          </div>
        </div>

        {/* Citations List */}
        {data.citations.length > 0 && (
          <div>
            <ItemTitle title="cites the following:" className="mb-3" />
            <div className="space-y-3">
              {data.citations.map((citation, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-md border bg-muted/30 p-3"
                >
                  <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
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
                      <ExternalUriLink
                        uri={citation.citedWork}
                        label={getLabel(citation.citedWork)}
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
