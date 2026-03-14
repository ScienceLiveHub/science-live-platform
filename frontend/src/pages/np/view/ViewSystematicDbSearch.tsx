/**
 * ViewSystematicDbSearch
 *
 * User-friendly view for nanopubs created with the
 * "Declaring a systematic database search" template.
 *
 * Displays: label, systematic review, search strategy, database,
 * search date, query string, and retrieved record count.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { toScienceLiveNPUri } from "@/lib/uri";
import { Database } from "lucide-react";
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

const SYSTEMATIC_DB_SEARCH_TYPE =
  "https://w3id.org/sciencelive/o/terms/SystematicDatabaseSearch";
const FOLLOWS_SEARCH_STRATEGY =
  "https://w3id.org/sciencelive/o/terms/followsSearchStrategy";
const HAS_DATABASE_URL =
  "https://w3id.org/sciencelive/o/terms/hasDatabaseUrl";
const HAS_SEARCH_TIME =
  "https://w3id.org/sciencelive/o/terms/hasSearchTime";
const HAS_SEARCH_QUERY =
  "https://w3id.org/sciencelive/o/terms/hasSearchQuery";
const HAS_RETRIEVED_RECORD_COUNT =
  "https://w3id.org/sciencelive/o/terms/hasRetrievedRecordCount";
const DCT_IS_PART_OF = "http://purl.org/dc/terms/isPartOf";

interface SystematicDbSearchData {
  searchUri: string;
  label?: string;
  systematicReviewUri?: string;
  searchStrategyUri?: string;
  databaseUrl?: string;
  date?: string;
  query?: string;
  retrievedRecordCount?: string;
}

function extractSystematicDbSearch(
  store: NanopubStore,
): SystematicDbSearchData | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);

  const typeQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(SYSTEMATIC_DB_SEARCH_TYPE),
    g,
  );
  if (!typeQuad) return null;
  const searchUri = typeQuad.subject.value;
  const s = namedNode(searchUri);

  const label = store.matchOne(s, NS.RDFS("label"), null, g)?.object.value;

  const systematicReviewUri = store.matchOne(
    s,
    namedNode(DCT_IS_PART_OF),
    null,
    g,
  )?.object.value;

  const searchStrategyUri = store.matchOne(
    s,
    namedNode(FOLLOWS_SEARCH_STRATEGY),
    null,
    g,
  )?.object.value;

  const databaseUrl = store.matchOne(
    s,
    namedNode(HAS_DATABASE_URL),
    null,
    g,
  )?.object.value;

  const date = store.matchOne(s, namedNode(HAS_SEARCH_TIME), null, g)?.object
    .value;

  const query = store.matchOne(s, namedNode(HAS_SEARCH_QUERY), null, g)?.object
    .value;

  const retrievedRecordCount = store.matchOne(
    s,
    namedNode(HAS_RETRIEVED_RECORD_COUNT),
    null,
    g,
  )?.object.value;

  return {
    searchUri,
    label,
    systematicReviewUri,
    searchStrategyUri,
    databaseUrl,
    date,
    query,
    retrievedRecordCount,
  };
}

export function ViewSystematicDbSearch({ store }: CustomViewerProps) {
  const data = useMemo(() => extractSystematicDbSearch(store), [store]);
  const { getLabel } = useLabels(store.labelCache);

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-sky-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5 text-sky-600" />
          Systematic Database Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Label */}
        {data.label && (
          <div>
            <ItemTitle title="Search" className="mb-2" />
            <div className="rounded-md border-l-4 border-sky-400 bg-sky-50 p-4 dark:bg-sky-950/20">
              <p className="text-lg font-medium leading-relaxed">
                {data.label}
              </p>
            </div>
          </div>
        )}

        {/* Systematic Review */}
        {data.systematicReviewUri && (
          <RelatedNanopubLink
            uri={data.systematicReviewUri}
            label={getLabel(data.systematicReviewUri)}
            href={toScienceLiveNPUri(data.systematicReviewUri)}
            title="Part of Systematic Review"
          />
        )}

        {/* Search Strategy */}
        {data.searchStrategyUri && (
          <RelatedNanopubLink
            uri={data.searchStrategyUri}
            label={getLabel(data.searchStrategyUri)}
            href={toScienceLiveNPUri(data.searchStrategyUri)}
            title="Follows Search Strategy"
          />
        )}

        {/* Database */}
        {data.databaseUrl && (
          <div>
            <ItemTitle title="Database" className="mb-2" />
            <ExternalUriLink
              uri={data.databaseUrl}
              label={getLabel(data.databaseUrl)}
            />
          </div>
        )}

        {/* Date & Record Count side by side */}
        <div className="flex flex-wrap gap-6">
          {data.date && (
            <div>
              <ItemTitle title="Search Date" className="mb-2" />
              <p className="text-sm">{data.date}</p>
            </div>
          )}

          {data.retrievedRecordCount && (
            <div>
              <ItemTitle title="Records Retrieved" className="mb-2" />
              <p className="text-sm font-medium">{data.retrievedRecordCount}</p>
            </div>
          )}
        </div>

        {/* Query */}
        {data.query && (
          <CommentBlock
            text={data.query}
            title="Search Query"
            showIcon={false}
          />
        )}
      </CardContent>
    </Card>
  );
}
