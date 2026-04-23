/**
 * ViewPRISMASearchExecutionDataset
 *
 * User-friendly view for nanopubs created with the
 * "Declaring a PRISMA search execution dataset" template.
 *
 * Displays: label, systematic review, completion date, database searches,
 * methodology fields, screening counts, exclusion breakdown, limitations,
 * and dataset file location.
 */

import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import {
  TEMPLATE_METADATA,
  TEMPLATE_URI,
  getTemplateBorderClass,
  getTemplateColorClass,
} from "../create/components/templates/registry-metadata";
import { CustomViewerProps } from "./NanopubViewer";
import { CommentBlock, ExternalUriLink, ItemTitle } from "./shared-components";
import { TEMPLATE_VIEW_ICONS } from "./view-registry";

const { namedNode } = DataFactory;

const SL = (term: string) => `https://w3id.org/sciencelive/o/terms/${term}`;

const SEARCH_EXECUTION_DATASET_TYPE = SL("SearchExecutionDataset");
const INCLUDES_DB_SEARCH = SL("includesDbSearch");
const USES_DEDUP_METHODOLOGY = SL("usesDeduplicationMethodology");
const USES_REVIEW_METHODOLOGY = SL("usesReviewMethodology");
const USES_SCREENING_METHODOLOGY = SL("usesScreeningMethodology");
const HAS_SCREENED_RECORD_COUNT = SL("hasScreenedRecordCount");
const HAS_FULLTEXT_SCREENED_RECORD_COUNT = SL("hasFulltextScreenedRecordCount");
const HAS_FINAL_INCLUDED_STUDY_COUNT = SL("hasFinalIncludedStudyCount");
const HAS_EXCLUSION_BREAKDOWN = SL("hasExclusionBreakdown");
const HAS_LIMITATIONS = SL("hasLimitations");
const HAS_DATASET_FILE_LOCATION = SL("hasDatasetFileLocation");
const DCT_IS_PART_OF = "http://purl.org/dc/terms/isPartOf";
const DCT_CREATED = "http://purl.org/dc/terms/created";

interface PRISMASearchExecutionData {
  datasetUri: string;
  label?: string;
  systematicReviewUri?: string;
  completionDate?: string;
  dbSearches: { uri: string }[];
  deduplicationMethodology?: string;
  reviewMethodology?: string;
  screeningMethodology?: string;
  screenedRecordCount?: string;
  fulltextScreenedRecordCount?: string;
  finalIncludedStudyCount?: string;
  exclusionBreakdown?: string;
  limitations?: string;
  datasetFileLocation?: string;
}

function extractData(store: NanopubStore): PRISMASearchExecutionData | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);

  const typeQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(SEARCH_EXECUTION_DATASET_TYPE),
    g,
  );
  if (!typeQuad) return null;
  const datasetUri = typeQuad.subject.value;
  const s = namedNode(datasetUri);

  const literal = (pred: string) =>
    store.matchOne(s, namedNode(pred), null, g)?.object.value;

  const dbSearches = store
    .getQuads(s, namedNode(INCLUDES_DB_SEARCH), null, g)
    .filter((q) => Util.isNamedNode(q.object))
    .map((q) => ({ uri: q.object.value }));

  return {
    datasetUri,
    label: store.matchOne(s, NS.RDFS("label"), null, g)?.object.value,
    systematicReviewUri: store.matchOne(s, namedNode(DCT_IS_PART_OF), null, g)
      ?.object.value,
    completionDate: literal(DCT_CREATED),
    dbSearches,
    deduplicationMethodology: literal(USES_DEDUP_METHODOLOGY),
    reviewMethodology: literal(USES_REVIEW_METHODOLOGY),
    screeningMethodology: literal(USES_SCREENING_METHODOLOGY),
    screenedRecordCount: literal(HAS_SCREENED_RECORD_COUNT),
    fulltextScreenedRecordCount: literal(HAS_FULLTEXT_SCREENED_RECORD_COUNT),
    finalIncludedStudyCount: literal(HAS_FINAL_INCLUDED_STUDY_COUNT),
    exclusionBreakdown: literal(HAS_EXCLUSION_BREAKDOWN),
    limitations: literal(HAS_LIMITATIONS),
    datasetFileLocation: literal(HAS_DATASET_FILE_LOCATION),
  };
}

export function ViewPRISMASearchExecutionDataset({ store }: CustomViewerProps) {
  const data = useMemo(() => extractData(store), [store]);
  const { resolvedTheme } = useTheme();
  const { getLabel } = useLabels();

  if (!data) return null;

  const Icon =
    TEMPLATE_VIEW_ICONS[TEMPLATE_URI.PRISMA_SEARCH_EXECUTION_DATASET];
  const color =
    TEMPLATE_METADATA[TEMPLATE_URI.PRISMA_SEARCH_EXECUTION_DATASET].color!;

  return (
    <Card
      className={`border-l-8 ${getTemplateBorderClass(color, resolvedTheme)}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon
            className={`h-5 w-5 ${getTemplateColorClass(color, resolvedTheme)}`}
          />
          Search Execution Dataset
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {data.label && (
          <div>
            <ItemTitle title="Dataset" className="mb-2" />
            <div className="rounded-md border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-4">
              <p className="text-lg font-medium leading-relaxed">
                {data.label}
              </p>
            </div>
          </div>
        )}

        {data.systematicReviewUri && (
          <div>
            <ItemTitle title="Part of Systematic Review" className="mb-2" />
            <ExternalUriLink
              uri={data.systematicReviewUri}
              label={getLabel(data.systematicReviewUri)}
            />
          </div>
        )}

        {data.completionDate && (
          <div>
            <ItemTitle title="Completion Date" className="mb-2" />
            <p className="text-sm">{data.completionDate}</p>
          </div>
        )}

        {/* Database Searches */}
        {data.dbSearches.length > 0 && (
          <div>
            <ItemTitle title="Included Database Searches" className="mb-2" />
            <div className="flex flex-wrap gap-2">
              {data.dbSearches.map((db) => (
                <a
                  key={db.uri}
                  href={db.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline"
                >
                  <Badge
                    variant="secondary"
                    className="gap-1 hover:bg-secondary/80"
                  >
                    {getLabel(db.uri)}
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Screening Counts */}
        {(data.screenedRecordCount ||
          data.fulltextScreenedRecordCount ||
          data.finalIncludedStudyCount) && (
          <div>
            <ItemTitle title="Screening Summary" className="mb-2" />
            <div className="grid grid-cols-3 gap-4">
              {data.screenedRecordCount && (
                <div className="rounded-md border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold">
                    {data.screenedRecordCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Records Screened
                  </p>
                </div>
              )}
              {data.fulltextScreenedRecordCount && (
                <div className="rounded-md border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold">
                    {data.fulltextScreenedRecordCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Full-text Screened
                  </p>
                </div>
              )}
              {data.finalIncludedStudyCount && (
                <div className="rounded-md border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold">
                    {data.finalIncludedStudyCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Studies Included
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {data.deduplicationMethodology && (
          <CommentBlock
            text={data.deduplicationMethodology}
            title="Deduplication Methodology"
            showIcon={false}
          />
        )}

        {data.reviewMethodology && (
          <CommentBlock
            text={data.reviewMethodology}
            title="Review Methodology"
            showIcon={false}
          />
        )}

        {data.screeningMethodology && (
          <CommentBlock
            text={data.screeningMethodology}
            title="Screening Methodology"
            showIcon={false}
          />
        )}

        {data.exclusionBreakdown && (
          <CommentBlock
            text={data.exclusionBreakdown}
            title="Exclusion Breakdown"
            showIcon={false}
          />
        )}

        {data.limitations && (
          <CommentBlock
            text={data.limitations}
            title="Limitations"
            showIcon={false}
          />
        )}

        {data.datasetFileLocation && (
          <div>
            <ItemTitle title="Dataset File" className="mb-2" />
            <ExternalUriLink uri={data.datasetFileLocation} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
