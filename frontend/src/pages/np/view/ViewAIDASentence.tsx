/**
 * ViewAIDASentence
 *
 * User-friendly view for nanopubs created with the "AIDA Sentence" template.
 * Displays the scientific claim sentence, topics, related nanopub,
 * and supporting evidence in a clean, readable format.
 *
 * AIDA = Atomic, Independent, Declarative, Absolute sentences.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { toScienceLiveNPUri } from "@/lib/uri";
import { Database, ExternalLink, FlaskConical, Link2, Tag } from "lucide-react";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import { CustomViewerProps, NanopubViewShell } from "./NanopubViewShell";

const { namedNode } = DataFactory;

const SCHEMA_ABOUT = "http://schema.org/about";
const SKOS_RELATED = "http://www.w3.org/2004/02/skos/core#related";
const AIDA_SENTENCE = "http://purl.org/petapico/o/hycl#AIDA-Sentence";

// --- AIDA Sentence extraction -----------------------------------------

interface AIDASentenceData {
  /** The AIDA sentence text (decoded from the URI) */
  sentence: string;
  /** The AIDA sentence URI */
  sentenceUri: string;
  /** Topics the sentence is about */
  topics: { uri: string; label?: string }[];
  /** Related nanopublication URI */
  relatedNanopub?: string;
  /** Supporting dataset URL */
  supportingDataset?: string;
}

function extractAIDASentence(store: NanopubStore): AIDASentenceData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find the AIDA sentence: subject with rdf:type hycl:AIDA-Sentence
  const aidaTypeQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(AIDA_SENTENCE),
    assertionGraph,
  );

  if (!aidaTypeQuad) return null;

  const sentenceUri = aidaTypeQuad.subject.value;

  // Decode the sentence from the URI (it's URL-encoded after "http://purl.org/aida/")
  let sentence = sentenceUri;
  try {
    const aidaPrefix = "http://purl.org/aida/";
    if (sentenceUri.startsWith(aidaPrefix)) {
      sentence = decodeURIComponent(sentenceUri.substring(aidaPrefix.length));
    }
  } catch {
    // Keep the raw URI if decoding fails
  }

  // Find topics (schema:about)
  const topicQuads = store.getQuads(
    namedNode(sentenceUri),
    namedNode(SCHEMA_ABOUT),
    null,
    assertionGraph,
  );
  const topics = topicQuads
    .filter((q) => Util.isNamedNode(q.object))
    .map((q) => ({
      uri: q.object.value,
      label: store.findInternalLabel(q.object.value),
    }));

  // Find related nanopub (skos:related)
  const relatedQuad = store.matchOne(
    namedNode(sentenceUri),
    namedNode(SKOS_RELATED),
    null,
    assertionGraph,
  );
  const relatedNanopub = relatedQuad?.object.value;

  // Find supporting dataset (cito:obtainsSupportFrom)
  const datasetQuad = store.matchOne(
    namedNode(sentenceUri),
    NS.CITO("obtainsSupportFrom"),
    null,
    assertionGraph,
  );
  const supportingDataset = datasetQuad?.object.value;

  return {
    sentence,
    sentenceUri,
    topics,
    relatedNanopub,
    supportingDataset,
  };
}

function AIDASentenceContent({
  data,
  store,
}: {
  data: AIDASentenceData;
  store: NanopubStore;
}) {
  const { getLabel } = useLabels(store.labelCache);

  return (
    <Card className="border-l-8 border-l-emerald-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FlaskConical className="h-5 w-5 text-emerald-600" />
          AIDA Sentence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* The Sentence */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Scientific Claim
          </p>
          <div className="rounded-md border-l-4 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-4">
            <p className="text-lg font-medium leading-relaxed">
              {data.sentence}
            </p>
          </div>
        </div>

        {/* Topics */}
        {data.topics.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              <Tag className="h-4 w-4 inline-block mr-1" />
              Topics
            </p>
            <div className="flex flex-wrap gap-2">
              {data.topics.map((topic) => (
                <a
                  key={topic.uri}
                  href={topic.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline"
                >
                  <Badge
                    variant="secondary"
                    className="gap-1 hover:bg-secondary/80 cursor-pointer"
                  >
                    {getLabel(topic.uri)}
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        )}
        {/* Related Nanopub */}
        {data.relatedNanopub && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Related Nanopublication
            </p>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={toScienceLiveNPUri(data.relatedNanopub)}
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 break-all text-sm"
              >
                {getLabel(data.relatedNanopub)}
              </a>
            </div>
          </div>
        )}

        {/* Supporting Dataset */}
        {data.supportingDataset && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Supporting Dataset
            </p>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={data.supportingDataset}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 break-all text-sm"
              >
                {getLabel(data.supportingDataset)}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ViewAIDASentence({
  store,
  creatorUserIdsByOrcid,
}: CustomViewerProps) {
  const data = useMemo(() => extractAIDASentence(store), [store]);

  if (!data) return null;

  return (
    <NanopubViewShell
      store={store}
      creatorUserIdsByOrcid={creatorUserIdsByOrcid}
    >
      <AIDASentenceContent data={data} store={store} />
    </NanopubViewShell>
  );
}
