/**
 * ViewFORRTReplicationOutcome
 *
 * User-friendly view for nanopubs created with the
 * "Declaring a replication study outcome according to FORRT" template.
 *
 * Displays: label, linked study, repository, completion date, validation status,
 * conclusion, evidence, confidence level, and limitations.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { toScienceLiveNPUri } from "@/lib/uri";
import { ClipboardCheck, Tag } from "lucide-react";
import { DataFactory } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "../create/components/NanopubViewer";
import {
  CommentBlock,
  ExternalUriLink,
  ItemTitle,
  RelatedNanopubLink,
} from "./shared-components";

const { namedNode } = DataFactory;

const FORRT_OUTCOME_TYPE =
  "https://w3id.org/sciencelive/o/terms/FORRT-Replication-Outcome";
const IS_OUTCOME_OF =
  "https://w3id.org/sciencelive/o/terms/isOutcomeOf";
const HAS_OUTCOME_REPO =
  "https://w3id.org/sciencelive/o/terms/hasOutcomeRepository";
const SCHEMA_END_DATE = "http://schema.org/endDate";
const HAS_VALIDATION_STATUS =
  "https://w3id.org/sciencelive/o/terms/hasValidationStatus";
const HAS_CONCLUSION =
  "https://w3id.org/sciencelive/o/terms/hasConclusionDescription";
const HAS_EVIDENCE =
  "https://w3id.org/sciencelive/o/terms/hasEvidenceDescription";
const HAS_CONFIDENCE =
  "https://w3id.org/sciencelive/o/terms/hasConfidenceLevel";
const HAS_LIMITATIONS =
  "https://w3id.org/sciencelive/o/terms/hasLimitationsDescription";

interface FORRTOutcomeData {
  outcomeUri: string;
  label?: string;
  studyUri?: string;
  repoUri?: string;
  date?: string;
  validationStatus?: { uri: string; label?: string };
  conclusion?: string;
  evidence?: string;
  confidenceLevel?: { uri: string; label?: string };
  limitations?: string;
}

function extractFORRTOutcome(
  store: NanopubStore,
): FORRTOutcomeData | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);

  const outcomeQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(FORRT_OUTCOME_TYPE),
    g,
  );
  if (!outcomeQuad) return null;
  const outcomeUri = outcomeQuad.subject.value;
  const s = namedNode(outcomeUri);

  const label = store.matchOne(s, NS.RDFS("label"), null, g)?.object.value;

  const studyUri = store.matchOne(s, namedNode(IS_OUTCOME_OF), null, g)?.object
    .value;

  const repoUri = store.matchOne(s, namedNode(HAS_OUTCOME_REPO), null, g)
    ?.object.value;

  const date = store.matchOne(s, namedNode(SCHEMA_END_DATE), null, g)?.object
    .value;

  const validationStatusUri = store.matchOne(
    s,
    namedNode(HAS_VALIDATION_STATUS),
    null,
    g,
  )?.object.value;
  const validationStatus = validationStatusUri
    ? {
        uri: validationStatusUri,
        label: store.findInternalLabel(validationStatusUri),
      }
    : undefined;

  const conclusion = store.matchOne(s, namedNode(HAS_CONCLUSION), null, g)
    ?.object.value;

  const evidence = store.matchOne(s, namedNode(HAS_EVIDENCE), null, g)?.object
    .value;

  const confidenceLevelUri = store.matchOne(
    s,
    namedNode(HAS_CONFIDENCE),
    null,
    g,
  )?.object.value;
  const confidenceLevel = confidenceLevelUri
    ? {
        uri: confidenceLevelUri,
        label: store.findInternalLabel(confidenceLevelUri),
      }
    : undefined;

  const limitations = store.matchOne(s, namedNode(HAS_LIMITATIONS), null, g)
    ?.object.value;

  return {
    outcomeUri,
    label,
    studyUri,
    repoUri,
    date,
    validationStatus,
    conclusion,
    evidence,
    confidenceLevel,
    limitations,
  };
}

export function ViewFORRTReplicationOutcome({ store }: CustomViewerProps) {
  const data = useMemo(() => extractFORRTOutcome(store), [store]);
  const { getLabel } = useLabels(store.labelCache);

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-teal-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardCheck className="h-5 w-5 text-teal-600" />
          FORRT Replication Outcome
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Label */}
        {data.label && (
          <div>
            <ItemTitle title="Outcome" className="mb-2" />
            <div className="rounded-md border-l-4 border-teal-400 bg-teal-50 p-4 dark:bg-teal-950/20">
              <p className="text-lg font-medium leading-relaxed">
                {data.label}
              </p>
            </div>
          </div>
        )}

        {/* Validation Status & Confidence side by side */}
        <div className="flex flex-wrap gap-4">
          {data.validationStatus && (
            <div>
              <ItemTitle
                title="Validation Status"
                icon={<Tag className="h-4 w-4 inline-block mr-1" />}
                className="mb-2"
              />
              <a
                href={data.validationStatus.uri}
                target="_blank"
                rel="noreferrer"
                className="no-underline"
              >
                <Badge
                  variant="secondary"
                  className="gap-1 hover:bg-secondary/80"
                >
                  {data.validationStatus.label ||
                    getLabel(data.validationStatus.uri)}
                </Badge>
              </a>
            </div>
          )}

          {data.confidenceLevel && (
            <div>
              <ItemTitle
                title="Confidence Level"
                icon={<Tag className="h-4 w-4 inline-block mr-1" />}
                className="mb-2"
              />
              <a
                href={data.confidenceLevel.uri}
                target="_blank"
                rel="noreferrer"
                className="no-underline"
              >
                <Badge
                  variant="secondary"
                  className="gap-1 hover:bg-secondary/80"
                >
                  {data.confidenceLevel.label ||
                    getLabel(data.confidenceLevel.uri)}
                </Badge>
              </a>
            </div>
          )}
        </div>

        {/* Linked Study */}
        {data.studyUri && (
          <RelatedNanopubLink
            uri={data.studyUri}
            label={getLabel(data.studyUri)}
            href={toScienceLiveNPUri(data.studyUri)}
            title="Outcome of Study"
          />
        )}

        {/* Conclusion */}
        {data.conclusion && (
          <CommentBlock
            text={data.conclusion}
            title="Conclusion"
            showIcon={false}
          />
        )}

        {/* Evidence */}
        {data.evidence && (
          <CommentBlock
            text={data.evidence}
            title="Evidence"
            showIcon={false}
          />
        )}

        {/* Limitations */}
        {data.limitations && (
          <CommentBlock
            text={data.limitations}
            title="Limitations"
            showIcon={false}
          />
        )}

        {/* Repository */}
        {data.repoUri && (
          <div>
            <ItemTitle title="Repository" className="mb-2" />
            <ExternalUriLink uri={data.repoUri} />
          </div>
        )}

        {/* Completion Date */}
        {data.date && (
          <div>
            <ItemTitle title="Completed" className="mb-2" />
            <p className="text-sm">{data.date}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
