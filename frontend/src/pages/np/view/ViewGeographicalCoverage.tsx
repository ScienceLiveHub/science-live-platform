/**
 * ViewGeographicalCoverage
 *
 * User-friendly view for nanopubs created with the "Document Geographical Coverage" template.
 * Displays the paper, quotation, comment, location name, and a read-only map
 * showing the WKT geometry.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { Globe, MapPin } from "lucide-react";
import { DataFactory } from "n3";
import { lazy, Suspense, useMemo } from "react";
import { CustomViewerProps } from "../create/components/NanopubViewer";
import {
  CommentBlock,
  ItemTitle,
  PaperLink,
  QuotationBlock,
} from "./shared-components";

const { namedNode } = DataFactory;

const GEOSPARQL = {
  hasGeometry: "http://www.opengis.net/ont/geosparql#hasGeometry",
  asWKT: "http://www.opengis.net/ont/geosparql#asWKT",
};

// --- Document Geographical Coverage extraction ------------------------

interface GeographicalCoverageData {
  /** The paper DOI/URL */
  paperUrl: string;
  /** The quoted text from the paper */
  quotedText: string;
  /** The user's comment explaining the geographical coverage */
  commentText: string;
  /** The location feature label (area name) */
  locationLabel: string;
  /** The WKT geometry string */
  wkt?: string;
}

function extractGeographicalCoverage(
  store: NanopubStore,
): GeographicalCoverageData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find the paper URL: subject that has dcterms:spatial
  const spatialQuad = store.matchOne(
    null,
    NS.DCT("spatial"),
    null,
    assertionGraph,
  );

  if (!spatialQuad) return null;

  const paperUrl = spatialQuad.subject.value;
  const featureUri = spatialQuad.object.value;

  // Find quoted text
  const quotedTextQuad = store.matchOne(
    namedNode(paperUrl),
    NS.CITO("hasQuotedText"),
    null,
    assertionGraph,
  );
  const quotedText = quotedTextQuad?.object.value ?? "";

  // Find comment
  const commentQuad = store.matchOne(
    namedNode(paperUrl),
    NS.RDFS("comment"),
    null,
    assertionGraph,
  );
  const commentText = commentQuad?.object.value ?? "";

  // Find location label
  const labelQuad = store.matchOne(
    namedNode(featureUri),
    NS.RDFS("label"),
    null,
    assertionGraph,
  );
  const locationLabel = labelQuad?.object.value ?? "";

  // Find geometry URI
  const geometryQuad = store.matchOne(
    namedNode(featureUri),
    namedNode(GEOSPARQL.hasGeometry),
    null,
    assertionGraph,
  );

  let wkt: string | undefined;
  if (geometryQuad) {
    const wktQuad = store.matchOne(
      namedNode(geometryQuad.object.value),
      namedNode(GEOSPARQL.asWKT),
      null,
      assertionGraph,
    );
    wkt = wktQuad?.object.value;
  }

  return { paperUrl, quotedText, commentText, locationLabel, wkt };
}

// Lazy-load the map component to avoid loading Leaflet when not needed
const ReadOnlyMap = lazy(() => import("../../../components/map-viewer"));

export function ViewGeographicalCoverage({ store }: CustomViewerProps) {
  const data = useMemo(() => extractGeographicalCoverage(store), [store]);

  const { getLabel } = useLabels(store.labelCache);

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-teal-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5 text-teal-600" />
          Geographical Coverage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Paper Reference */}
        {data.paperUrl && (
          <PaperLink url={data.paperUrl} label={getLabel(data.paperUrl)} />
        )}

        {/* Location */}
        {data.locationLabel && (
          <div>
            <ItemTitle
              title="Area"
              icon={<MapPin className="h-4 w-4 inline-block mr-1" />}
            />
            <Badge variant="secondary" className="text-sm gap-1">
              <span className="text-teal-600 opacity-70">⬤</span>{" "}
              {data.locationLabel}
            </Badge>
          </div>
        )}

        {/* Map */}
        {data.wkt && (
          <div>
            <div className="rounded-md border overflow-hidden h-87.5">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full bg-muted/30 text-muted-foreground">
                    Loading map…
                  </div>
                }
              >
                <ReadOnlyMap wkt={data.wkt} />
              </Suspense>
            </div>
          </div>
        )}

        {/* Quotation */}
        {data.quotedText && (
          <QuotationBlock
            text={data.quotedText}
            title="Supporting Quotation from paper"
            colorClass="border-teal-300"
            bgClass="bg-teal-50 dark:bg-teal-950/20"
          />
        )}

        {/* Comment */}
        {data.commentText && <CommentBlock text={data.commentText} />}
      </CardContent>
    </Card>
  );
}
