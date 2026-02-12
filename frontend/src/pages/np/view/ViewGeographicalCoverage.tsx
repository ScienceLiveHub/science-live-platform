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
import {
  ExternalLink,
  Globe,
  Link2,
  MapPin,
  MessageCircle,
  Quote,
} from "lucide-react";
import { DataFactory } from "n3";
import { lazy, Suspense, useMemo } from "react";
import { CustomViewerProps, NanopubViewShell } from "./NanopubViewShell";

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

function GeoCoverageContent({
  data,
  store,
}: {
  data: GeographicalCoverageData;
  store: NanopubStore;
}) {
  const { getLabel } = useLabels(store.labelCache);

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

        {/* Location */}
        {data.locationLabel && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              <MapPin className="h-4 w-4 inline-block mr-1" />
              Area
            </p>
            <Badge variant="secondary" className="text-sm gap-1">
              <MapPin className="h-3 w-3" />
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
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Supporting Quotation from paper
            </p>
            <blockquote className="rounded-md border-l-4 border-teal-300 bg-teal-50 dark:bg-teal-950/20 p-4 text-base leading-relaxed">
              <Quote className="h-4 w-4 text-teal-400 mb-1 inline-block mr-1" />
              <span className="italic">{data.quotedText}</span>
            </blockquote>
          </div>
        )}

        {/* Comment */}
        {data.commentText && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              <MessageCircle className="h-4 w-4 inline-block mr-1" />
              Comment
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

export function ViewGeographicalCoverage({
  store,
  creatorUserIdsByOrcid,
}: CustomViewerProps) {
  const data = useMemo(() => extractGeographicalCoverage(store), [store]);

  if (!data) return null;

  return (
    <NanopubViewShell
      store={store}
      creatorUserIdsByOrcid={creatorUserIdsByOrcid}
    >
      <GeoCoverageContent data={data} store={store} />
    </NanopubViewShell>
  );
}
