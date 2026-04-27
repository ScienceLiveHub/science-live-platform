/**
 * ViewResearchSynthesis
 *
 * User-friendly view for nanopubs created with the
 * "Science Live Research Synthesis" template.
 *
 * Displays: label, conclusion, recommendations, conditions, limitations,
 * supporting sources, linked Wikidata topics, and the completion date.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { useNanopub } from "@/hooks/use-nanopub";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { toScienceLiveNPUri } from "@/lib/uri";
import { Dna, Tag } from "lucide-react";
import { DataFactory } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "./NanopubViewer";
import {
  CommentBlock,
  ExternalUriLink,
  ItemTitle,
  RelatedNanopubLink,
} from "./shared-components";

const { namedNode } = DataFactory;

const RESEARCH_SYNTHESIS_TYPE =
  "https://w3id.org/sciencelive/o/terms/Research-Synthesis";
const HAS_SYNTHESIS_DESC =
  "https://w3id.org/sciencelive/o/terms/hasSynthesisDescription";
const HAS_RECOMMENDATION_DESC =
  "https://w3id.org/sciencelive/o/terms/hasRecommendationDescription";
const HAS_CONDITIONS_DESC =
  "https://w3id.org/sciencelive/o/terms/hasConditionsDescription";
const HAS_LIMITATIONS_DESC =
  "https://w3id.org/sciencelive/o/terms/hasLimitationsDescription";
const SCHEMA_END_DATE = "http://schema.org/endDate";
const CITO_IS_SUPPORTED_BY = "http://purl.org/spar/cito/isSupportedBy";
const DCT_SUBJECT = "http://purl.org/dc/terms/subject";

const NANOPUB_URI_RE = /\/np\/(RA[A-Za-z0-9_-]{43})$/;

function isNanopubUri(uri: string) {
  return NANOPUB_URI_RE.test(uri);
}

// Nanopub trusty URIs all share the "NP created using ..." rdfs:label pattern,
// which makes a list of sources indistinguishable. Show the trusty hash
// instead so the reader can tell them apart.
function nanopubShortId(uri: string): string {
  const m = uri.match(NANOPUB_URI_RE);
  return m ? m[1] : uri;
}

const FORRT_OUTCOME_TYPE =
  "https://w3id.org/sciencelive/o/terms/FORRT-Replication-Outcome";

/** Pull the outcome label out of a loaded FORRT-Replication-Outcome nanopub. */
function getForrtOutcomeLabel(store: NanopubStore): string | undefined {
  if (!store.graphUris.assertion) return undefined;
  const g = namedNode(store.graphUris.assertion);
  const outcomeQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(FORRT_OUTCOME_TYPE),
    g,
  );
  if (!outcomeQuad) return undefined;
  return store.matchOne(
    namedNode(outcomeQuad.subject.value),
    NS.RDFS("label"),
    null,
    g,
  )?.object.value;
}

/** Renders one supporting nanopub row, loading the outcome label on demand. */
function SupportingOutcomeLink({ uri }: { uri: string }) {
  const { store, loading } = useNanopub(uri);
  const outcomeLabel = store ? getForrtOutcomeLabel(store) : undefined;
  const label = outcomeLabel ?? (loading ? "Loading…" : nanopubShortId(uri));
  return (
    <RelatedNanopubLink
      uri={uri}
      label={label}
      href={toScienceLiveNPUri(uri)}
      title=""
    />
  );
}

interface ResearchSynthesisData {
  synthesisUri: string;
  label?: string;
  conclusion?: string;
  recommendation?: string;
  conditions?: string;
  limitations?: string;
  date?: string;
  sources: string[];
  topics: { uri: string; label?: string }[];
}

function extractResearchSynthesis(
  store: NanopubStore,
): ResearchSynthesisData | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);

  const synthesisQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(RESEARCH_SYNTHESIS_TYPE),
    g,
  );
  if (!synthesisQuad) return null;
  const synthesisUri = synthesisQuad.subject.value;
  const s = namedNode(synthesisUri);

  const label = store.matchOne(s, NS.RDFS("label"), null, g)?.object.value;
  const conclusion = store.matchOne(s, namedNode(HAS_SYNTHESIS_DESC), null, g)
    ?.object.value;
  const recommendation = store.matchOne(
    s,
    namedNode(HAS_RECOMMENDATION_DESC),
    null,
    g,
  )?.object.value;
  const conditions = store.matchOne(s, namedNode(HAS_CONDITIONS_DESC), null, g)
    ?.object.value;
  const limitations = store.matchOne(
    s,
    namedNode(HAS_LIMITATIONS_DESC),
    null,
    g,
  )?.object.value;
  const date = store.matchOne(s, namedNode(SCHEMA_END_DATE), null, g)?.object
    .value;

  const sources = store
    .getQuads(s, namedNode(CITO_IS_SUPPORTED_BY), null, g)
    .map((q) => q.object.value);

  // Wikidata labels written by Nanodash are stored as "label - description"
  // in a single literal. Keep only the short label part for display.
  const shortLabel = (s?: string) =>
    s ? s.split(/\s+-\s+/, 1)[0] : undefined;

  const topics = store
    .getQuads(s, namedNode(DCT_SUBJECT), null, g)
    .map((q) => ({
      uri: q.object.value,
      label: shortLabel(store.findInternalLabel(q.object.value)),
    }));

  return {
    synthesisUri,
    label,
    conclusion,
    recommendation,
    conditions,
    limitations,
    date,
    sources,
    topics,
  };
}

export function ViewResearchSynthesis({ store }: CustomViewerProps) {
  const data = useMemo(() => extractResearchSynthesis(store), [store]);
  const { getLabel } = useLabels();

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-indigo-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Dna className="h-5 w-5 text-indigo-600" />
          Research Synthesis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {data.label && (
          <div>
            <ItemTitle title="Synthesis" className="mb-2" />
            <div className="rounded-md border-l-4 border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 p-4">
              <p className="text-lg font-medium leading-relaxed">
                {data.label}
              </p>
            </div>
          </div>
        )}

        {data.topics.length > 0 && (
          <div>
            <ItemTitle
              title="Topics"
              icon={<Tag className="h-4 w-4 inline-block mr-1" />}
              className="mb-2"
            />
            <div className="flex flex-wrap gap-2">
              {data.topics.map((t) => (
                <a
                  key={t.uri}
                  href={t.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline"
                >
                  <Badge
                    variant="secondary"
                    className="gap-1 hover:bg-secondary/80"
                  >
                    {t.label || getLabel(t.uri)}
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        )}

        {data.conclusion && (
          <CommentBlock
            text={data.conclusion}
            title="Conclusion"
            showIcon={false}
          />
        )}

        {data.recommendation && (
          <CommentBlock
            text={data.recommendation}
            title="Recommendations"
            showIcon={false}
          />
        )}

        {data.conditions && (
          <CommentBlock
            text={data.conditions}
            title="Conditions"
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

        {data.sources.length > 0 && (
          <div>
            <ItemTitle title="Supported by" className="mb-2" />
            <ul className="space-y-2">
              {data.sources.map((src) => (
                <li key={src}>
                  {isNanopubUri(src) ? (
                    <SupportingOutcomeLink uri={src} />
                  ) : (
                    <ExternalUriLink uri={src} label={getLabel(src)} />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

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
