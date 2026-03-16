/**
 * ViewPRISMASearchStrategy
 *
 * User-friendly view for nanopubs created with the
 * "Defining a systematic review search strategy" template.
 *
 * Displays: label, parent systematic review, search terms, databases,
 * time period, languages, and methodology notes.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { SearchCheck, Tag } from "lucide-react";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "../create/components/NanopubViewer";
import {
  CommentBlock,
  ExternalUriLink,
  ItemTitle,
} from "./shared-components";

const { namedNode } = DataFactory;

const SEARCH_STRATEGY_TYPE =
  "https://w3id.org/sciencelive/o/terms/SystematicReviewSearchStrategy";
const HAS_SEARCH_TERMS =
  "https://w3id.org/sciencelive/o/terms/hasSearchTerms";
const HAS_SEARCH_DATABASE =
  "https://w3id.org/sciencelive/o/terms/hasSearchDatabase";
const COVERS_TIME_PERIOD =
  "https://w3id.org/sciencelive/o/terms/coversTimePeriod";
const TEMPORAL_START_DATE =
  "http://www.w3.org/ns/dcat#temporalStartDate";
const TEMPORAL_END_DATE =
  "http://www.w3.org/ns/dcat#temporalEndDate";
const COVERS_LANGUAGE =
  "https://w3id.org/sciencelive/o/terms/coversLanguage";
const HAS_METHODOLOGY_NOTES =
  "https://w3id.org/sciencelive/o/terms/hasMethodologyNotes";
const DCT_IS_PART_OF = "http://purl.org/dc/terms/isPartOf";

interface PRISMASearchStrategyData {
  strategyUri: string;
  label?: string;
  systematicReviewUri?: string;
  searchTerms: { uri: string }[];
  databases: { uri: string }[];
  startDate?: string;
  endDate?: string;
  languages: { uri: string; label?: string }[];
  methodologyNotes?: string;
}

function extractPRISMASearchStrategy(
  store: NanopubStore,
): PRISMASearchStrategyData | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);

  const typeQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(SEARCH_STRATEGY_TYPE),
    g,
  );
  if (!typeQuad) return null;
  const strategyUri = typeQuad.subject.value;
  const s = namedNode(strategyUri);

  const label = store.matchOne(s, NS.RDFS("label"), null, g)?.object.value;

  const systematicReviewUri = store.matchOne(
    s,
    namedNode(DCT_IS_PART_OF),
    null,
    g,
  )?.object.value;

  const searchTerms = store
    .getQuads(s, namedNode(HAS_SEARCH_TERMS), null, g)
    .filter((q) => Util.isNamedNode(q.object))
    .map((q) => ({ uri: q.object.value }));

  const databases = store
    .getQuads(s, namedNode(HAS_SEARCH_DATABASE), null, g)
    .filter((q) => Util.isNamedNode(q.object))
    .map((q) => ({ uri: q.object.value }));

  // Time period: the strategy links to a time period resource,
  // which has start and end dates
  const timePeriodQuad = store.matchOne(
    s,
    namedNode(COVERS_TIME_PERIOD),
    null,
    g,
  );
  let startDate: string | undefined;
  let endDate: string | undefined;
  if (timePeriodQuad) {
    const tp = namedNode(timePeriodQuad.object.value);
    startDate = store.matchOne(tp, namedNode(TEMPORAL_START_DATE), null, g)
      ?.object.value;
    endDate = store.matchOne(tp, namedNode(TEMPORAL_END_DATE), null, g)?.object
      .value;
  }

  const languages = store
    .getQuads(s, namedNode(COVERS_LANGUAGE), null, g)
    .filter((q) => Util.isNamedNode(q.object))
    .map((q) => ({
      uri: q.object.value,
      label: store.findInternalLabel(q.object.value),
    }));

  const methodologyNotes = store.matchOne(
    s,
    namedNode(HAS_METHODOLOGY_NOTES),
    null,
    g,
  )?.object.value;

  return {
    strategyUri,
    label,
    systematicReviewUri,
    searchTerms,
    databases,
    startDate,
    endDate,
    languages,
    methodologyNotes,
  };
}

export function ViewPRISMASearchStrategy({ store }: CustomViewerProps) {
  const data = useMemo(() => extractPRISMASearchStrategy(store), [store]);
  const { getLabel } = useLabels(store.labelCache);

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-amber-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <SearchCheck className="h-5 w-5 text-amber-600" />
          Systematic Review Search Strategy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Label */}
        {data.label && (
          <div>
            <ItemTitle title="Strategy" className="mb-2" />
            <div className="rounded-md border-l-4 border-amber-400 bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="text-lg font-medium leading-relaxed">
                {data.label}
              </p>
            </div>
          </div>
        )}

        {/* Systematic Review */}
        {data.systematicReviewUri && (
          <div>
            <ItemTitle title="Part of Systematic Review" className="mb-2" />
            <ExternalUriLink
              uri={data.systematicReviewUri}
              label={getLabel(data.systematicReviewUri)}
            />
          </div>
        )}

        {/* Search Terms */}
        {data.searchTerms.length > 0 && (
          <div>
            <ItemTitle
              title="Search Terms"
              icon={<Tag className="h-4 w-4 inline-block mr-1" />}
              className="mb-2"
            />
            <div className="flex flex-wrap gap-2">
              {data.searchTerms.map((term) => (
                <a
                  key={term.uri}
                  href={term.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline"
                >
                  <Badge
                    variant="secondary"
                    className="gap-1 hover:bg-secondary/80"
                  >
                    {getLabel(term.uri)}
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Databases */}
        {data.databases.length > 0 && (
          <div>
            <ItemTitle title="Databases" className="mb-2" />
            <div className="flex flex-wrap gap-2">
              {data.databases.map((db) => (
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

        {/* Time Period */}
        {(data.startDate || data.endDate) && (
          <div>
            <ItemTitle title="Time Period" className="mb-2" />
            <p className="text-sm">
              {data.startDate && <span>{data.startDate}</span>}
              {data.startDate && data.endDate && <span> to </span>}
              {data.endDate && <span>{data.endDate}</span>}
            </p>
          </div>
        )}

        {/* Languages */}
        {data.languages.length > 0 && (
          <div>
            <ItemTitle title="Languages" className="mb-2" />
            <div className="flex flex-wrap gap-2">
              {data.languages.map((lang) => (
                <a
                  key={lang.uri}
                  href={lang.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline"
                >
                  <Badge
                    variant="secondary"
                    className="gap-1 hover:bg-secondary/80"
                  >
                    {lang.label || getLabel(lang.uri)}
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Methodology Notes */}
        {data.methodologyNotes && (
          <CommentBlock
            text={data.methodologyNotes}
            title="Methodology Notes"
            showIcon={false}
          />
        )}
      </CardContent>
    </Card>
  );
}
