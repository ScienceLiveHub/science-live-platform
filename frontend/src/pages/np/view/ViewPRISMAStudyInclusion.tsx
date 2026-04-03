/**
 * ViewPRISMAStudyInclusion
 *
 * User-friendly view for nanopubs created with the
 * "Declaring a study to be included in a systematic review" template.
 *
 * Displays: study label, source (DOI/URI), and the systematic review it belongs to.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { BookCheck } from "lucide-react";
import { DataFactory } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "./NanopubViewer";
import { ExternalUriLink, ItemTitle } from "./shared-components";

const { namedNode } = DataFactory;

const STUDY_TYPE = "http://rdf-vocabulary.ddialliance.org/discovery#Study";
const DCT_SOURCE = "http://purl.org/dc/terms/source";
const INCLUDES_STUDY = "https://w3id.org/sciencelive/o/terms/includesStudy";

interface PRISMAStudyInclusionData {
  studyUri: string;
  studyLabel?: string;
  sourceUri?: string;
  systematicReviewUri?: string;
}

function extractData(store: NanopubStore): PRISMAStudyInclusionData | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);

  const typeQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(STUDY_TYPE),
    g,
  );
  if (!typeQuad) return null;
  const studyUri = typeQuad.subject.value;
  const s = namedNode(studyUri);

  // The systematic review is the subject of the includesStudy triple
  const includesQuad = store.matchOne(null, namedNode(INCLUDES_STUDY), s, g);

  return {
    studyUri,
    studyLabel: store.matchOne(s, NS.RDFS("label"), null, g)?.object.value,
    sourceUri: store.matchOne(s, namedNode(DCT_SOURCE), null, g)?.object.value,
    systematicReviewUri: includesQuad?.subject.value,
  };
}

export function ViewPRISMAStudyInclusion({ store }: CustomViewerProps) {
  const data = useMemo(() => extractData(store), [store]);
  const { getLabel } = useLabels();

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-amber-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookCheck className="h-5 w-5 text-amber-600" />
          Study Inclusion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {data.studyLabel && (
          <div>
            <ItemTitle title="Study" className="mb-2" />
            <div className="rounded-md border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-4">
              <p className="text-lg font-medium leading-relaxed">
                {data.studyLabel}
              </p>
            </div>
          </div>
        )}

        {data.sourceUri && (
          <div>
            <ItemTitle title="Source" className="mb-2" />
            <ExternalUriLink
              uri={data.sourceUri}
              label={getLabel(data.sourceUri)}
            />
          </div>
        )}

        {data.systematicReviewUri && (
          <div>
            <ItemTitle title="Included in Systematic Review" className="mb-2" />
            <ExternalUriLink
              uri={data.systematicReviewUri}
              label={getLabel(data.systematicReviewUri)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
