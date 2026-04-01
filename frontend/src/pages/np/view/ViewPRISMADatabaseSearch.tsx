/**
 * ViewPRISMADatabaseSearch
 *
 * User-friendly view for nanopubs created with the
 * "Declaring a systematic database search" template.
 *
 * Displays: label, systematic review, search strategy, database URL,
 * search date, query string, and retrieved record count.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { Database } from "lucide-react";
import { DataFactory } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "./NanopubViewer";
import { CommentBlock, ExternalUriLink, ItemTitle } from "./shared-components";

const { namedNode } = DataFactory;

const SL = (term: string) =>
  `https://w3id.org/sciencelive/o/terms/${term}`;

const DATABASE_SEARCH_TYPE = SL("SystematicDatabaseSearch");
const FOLLOWS_SEARCH_STRATEGY = SL("followsSearchStrategy");
const HAS_DATABASE_URL = SL("hasDatabaseUrl");
const HAS_SEARCH_TIME = SL("hasSearchTime");
const HAS_SEARCH_QUERY = SL("hasSearchQuery");
const HAS_RETRIEVED_RECORD_COUNT = SL("hasRetrievedRecordCount");
const DCT_IS_PART_OF = "http://purl.org/dc/terms/isPartOf";

interface PRISMADatabaseSearchData {
  searchUri: string;
  label?: string;
  systematicReviewUri?: string;
  searchStrategyUri?: string;
  databaseUrl?: string;
  searchDate?: string;
  searchQuery?: string;
  retrievedRecordCount?: string;
}

function extractData(store: NanopubStore): PRISMADatabaseSearchData | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);

  const typeQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(DATABASE_SEARCH_TYPE),
    g,
  );
  if (!typeQuad) return null;
  const searchUri = typeQuad.subject.value;
  const s = namedNode(searchUri);

  return {
    searchUri,
    label: store.matchOne(s, NS.RDFS("label"), null, g)?.object.value,
    systematicReviewUri: store.matchOne(s, namedNode(DCT_IS_PART_OF), null, g)
      ?.object.value,
    searchStrategyUri: store.matchOne(
      s,
      namedNode(FOLLOWS_SEARCH_STRATEGY),
      null,
      g,
    )?.object.value,
    databaseUrl: store.matchOne(s, namedNode(HAS_DATABASE_URL), null, g)?.object
      .value,
    searchDate: store.matchOne(s, namedNode(HAS_SEARCH_TIME), null, g)?.object
      .value,
    searchQuery: store.matchOne(s, namedNode(HAS_SEARCH_QUERY), null, g)?.object
      .value,
    retrievedRecordCount: store.matchOne(
      s,
      namedNode(HAS_RETRIEVED_RECORD_COUNT),
      null,
      g,
    )?.object.value,
  };
}

export function ViewPRISMADatabaseSearch({ store }: CustomViewerProps) {
  const data = useMemo(() => extractData(store), [store]);
  const { getLabel } = useLabels();

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-amber-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5 text-amber-600" />
          Database Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {data.label && (
          <div>
            <ItemTitle title="Search" className="mb-2" />
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

        {data.searchStrategyUri && (
          <div>
            <ItemTitle title="Follows Search Strategy" className="mb-2" />
            <ExternalUriLink
              uri={data.searchStrategyUri}
              label={getLabel(data.searchStrategyUri)}
            />
          </div>
        )}

        {data.databaseUrl && (
          <div>
            <ItemTitle title="Database" className="mb-2" />
            <ExternalUriLink uri={data.databaseUrl} />
          </div>
        )}

        {data.searchDate && (
          <div>
            <ItemTitle title="Search Date" className="mb-2" />
            <p className="text-sm">{data.searchDate}</p>
          </div>
        )}

        {data.searchQuery && (
          <CommentBlock
            text={data.searchQuery}
            title="Search Query"
            showIcon={false}
          />
        )}

        {data.retrievedRecordCount && (
          <div>
            <ItemTitle title="Retrieved Records" className="mb-2" />
            <Badge variant="secondary" className="text-base">
              {data.retrievedRecordCount}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
