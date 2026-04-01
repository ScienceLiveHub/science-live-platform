/**
 * ViewPRISMAStudyAssessment
 *
 * User-friendly view for nanopubs created with the
 * "Declaring a PRISMA study assessment dataset" template.
 *
 * Displays: label, systematic review, completion date, eligibility criteria,
 * assessment technique, study characteristics, extraction method,
 * study results, quality assessment, dataset file location, and limitations.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { ClipboardCheck } from "lucide-react";
import { DataFactory } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "./NanopubViewer";
import { CommentBlock, ExternalUriLink, ItemTitle } from "./shared-components";

const { namedNode } = DataFactory;

const SL = (term: string) =>
  `https://w3id.org/sciencelive/o/terms/${term}`;

const STUDY_ASSESSMENT_TYPE = SL("StudyAssessmentDataset");
const FOLLOWS_ELIGIBILITY_CRITERIA = SL("followsEligibilityCriteria");
const USES_ASSESSMENT_TECHNIQUE = SL("usesAssessmentTechnique");
const HAS_STUDY_CHARACTERISTICS = SL("hasStudyCharacteristics");
const HAS_DATASET_FILE_LOCATION = SL("hasDatasetFileLocation");
const HAS_LIMITATIONS = SL("hasLimitations");
const DCT_IS_PART_OF = "http://purl.org/dc/terms/isPartOf";
const DCT_CREATED = "http://purl.org/dc/terms/created";
const DCT_HAS_EXTRACTION_METHOD = "http://purl.org/dc/terms/hasExtractionMethod";
const DCT_HAS_STUDY_RESULTS = "http://purl.org/dc/terms/hasStudyResults";
const DCT_HAS_QUALITY_ASSESSMENT =
  "http://purl.org/dc/terms/hasQualityAssessment";

interface PRISMAStudyAssessmentData {
  datasetUri: string;
  label?: string;
  systematicReviewUri?: string;
  completionDate?: string;
  eligibilityCriteria?: string;
  assessmentTechnique?: string;
  studyCharacteristics?: string;
  extractionMethod?: string;
  studyResults?: string;
  qualityAssessment?: string;
  datasetFileLocation?: string;
  limitations?: string;
}

function extractData(
  store: NanopubStore,
): PRISMAStudyAssessmentData | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);

  const typeQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(STUDY_ASSESSMENT_TYPE),
    g,
  );
  if (!typeQuad) return null;
  const datasetUri = typeQuad.subject.value;
  const s = namedNode(datasetUri);

  const literal = (pred: string) =>
    store.matchOne(s, namedNode(pred), null, g)?.object.value;

  return {
    datasetUri,
    label: store.matchOne(s, NS.RDFS("label"), null, g)?.object.value,
    systematicReviewUri: store.matchOne(s, namedNode(DCT_IS_PART_OF), null, g)
      ?.object.value,
    completionDate: literal(DCT_CREATED),
    eligibilityCriteria: literal(FOLLOWS_ELIGIBILITY_CRITERIA),
    assessmentTechnique: literal(USES_ASSESSMENT_TECHNIQUE),
    studyCharacteristics: literal(HAS_STUDY_CHARACTERISTICS),
    extractionMethod: literal(DCT_HAS_EXTRACTION_METHOD),
    studyResults: literal(DCT_HAS_STUDY_RESULTS),
    qualityAssessment: literal(DCT_HAS_QUALITY_ASSESSMENT),
    datasetFileLocation: literal(HAS_DATASET_FILE_LOCATION),
    limitations: literal(HAS_LIMITATIONS),
  };
}

export function ViewPRISMAStudyAssessment({ store }: CustomViewerProps) {
  const data = useMemo(() => extractData(store), [store]);
  const { getLabel } = useLabels();

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-amber-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardCheck className="h-5 w-5 text-amber-600" />
          Study Assessment Dataset
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {data.label && (
          <div>
            <ItemTitle title="Assessment" className="mb-2" />
            <div className="rounded-md border-l-4 border-amber-400 bg-amber-50 p-4 dark:bg-amber-950/20">
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

        {data.eligibilityCriteria && (
          <CommentBlock
            text={data.eligibilityCriteria}
            title="Eligibility Criteria (PRISMA Item 5)"
            showIcon={false}
          />
        )}

        {data.assessmentTechnique && (
          <CommentBlock
            text={data.assessmentTechnique}
            title="Risk of Bias Assessment (PRISMA Item 11)"
            showIcon={false}
          />
        )}

        {data.studyCharacteristics && (
          <CommentBlock
            text={data.studyCharacteristics}
            title="Study Characteristics (PRISMA Item 17)"
            showIcon={false}
          />
        )}

        {data.extractionMethod && (
          <CommentBlock
            text={data.extractionMethod}
            title="Data Extraction Method"
            showIcon={false}
          />
        )}

        {data.studyResults && (
          <CommentBlock
            text={data.studyResults}
            title="Study Results (PRISMA Item 19)"
            showIcon={false}
          />
        )}

        {data.qualityAssessment && (
          <CommentBlock
            text={data.qualityAssessment}
            title="Quality Assessment (PRISMA Item 18)"
            showIcon={false}
          />
        )}

        {data.datasetFileLocation && (
          <div>
            <ItemTitle title="Dataset File" className="mb-2" />
            <ExternalUriLink uri={data.datasetFileLocation} />
          </div>
        )}

        {data.limitations && (
          <CommentBlock
            text={data.limitations}
            title="Limitations"
            showIcon={false}
          />
        )}
      </CardContent>
    </Card>
  );
}
