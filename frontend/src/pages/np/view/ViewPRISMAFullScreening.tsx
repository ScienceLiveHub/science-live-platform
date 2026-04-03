/**
 * ViewPRISMAFullScreening
 *
 * User-friendly view for nanopubs created with the
 * "Declaring a study to be selected for full screening" template.
 *
 * Displays: review URI and the selected study.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { ScanSearch } from "lucide-react";
import { DataFactory } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "./NanopubViewer";
import { ExternalUriLink, ItemTitle } from "./shared-components";

const { namedNode } = DataFactory;

const SELECTS_FOR_FULL_SCREENING =
  "https://w3id.org/sciencelive/o/terms/selectsForFullScreening";

interface PRISMAFullScreeningData {
  reviewUri: string;
  studyUri: string;
}

function extractData(store: NanopubStore): PRISMAFullScreeningData | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);

  const quad = store.matchOne(
    null,
    namedNode(SELECTS_FOR_FULL_SCREENING),
    null,
    g,
  );
  if (!quad) return null;

  return {
    reviewUri: quad.subject.value,
    studyUri: quad.object.value,
  };
}

export function ViewPRISMAFullScreening({ store }: CustomViewerProps) {
  const data = useMemo(() => extractData(store), [store]);
  const { getLabel } = useLabels();

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-amber-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ScanSearch className="h-5 w-5 text-amber-600" />
          Full Screening Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <ItemTitle title="Review" className="mb-2" />
          <ExternalUriLink
            uri={data.reviewUri}
            label={getLabel(data.reviewUri)}
          />
        </div>

        <div>
          <ItemTitle title="Selected Study" className="mb-2" />
          <ExternalUriLink
            uri={data.studyUri}
            label={getLabel(data.studyUri)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
