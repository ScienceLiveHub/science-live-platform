/**
 * ViewFORRTReplication
 *
 * User-friendly view for nanopubs created with the
 * "Declaring a replication study design according to FORRT" template.
 *
 * Displays: study label, study type, targeted claim, scope, methodology,
 * deviations, keywords, and discipline.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { toScienceLiveNPUri } from "@/lib/uri";
import { FlaskConical, Tag } from "lucide-react";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "./NanopubViewer";
import {
  CommentBlock,
  ExternalUriLink,
  ItemTitle,
  RelatedNanopubLink,
} from "./shared-components";

const { namedNode } = DataFactory;

const FORRT_REPLICATION_TYPE =
  "https://w3id.org/sciencelive/o/terms/FORRT-Replication-Study";
const TARGETS_CLAIM = "https://w3id.org/sciencelive/o/terms/targetsClaim";
const HAS_SCOPE = "https://w3id.org/sciencelive/o/terms/hasScopeDescription";
const HAS_METHODOLOGY =
  "https://w3id.org/sciencelive/o/terms/hasMethodologyDescription";
const HAS_DEVIATION =
  "https://w3id.org/sciencelive/o/terms/hasDeviationDescription";
const HAS_DISCIPLINE = "https://w3id.org/sciencelive/o/terms/hasDiscipline";
const SKOS_RELATED = "http://www.w3.org/2004/02/skos/core#related";

interface FORRTReplicationData {
  studyUri: string;
  label?: string;
  studyTypes: { uri: string; label?: string }[];
  claimUri?: string;
  scope?: string;
  methodology?: string;
  deviation?: string;
  keywords: { uri: string; label?: string }[];
  disciplineUri?: string;
}

function extractFORRTReplication(
  store: NanopubStore,
): FORRTReplicationData | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);

  // Find study subject typed as FORRT-Replication-Study
  const studyQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(FORRT_REPLICATION_TYPE),
    g,
  );
  if (!studyQuad) return null;
  const studyUri = studyQuad.subject.value;
  const sNode = namedNode(studyUri);

  // Label
  const label = store.matchOne(sNode, NS.RDFS("label"), null, g)?.object.value;

  // Study types (additional rdf:type values beyond FORRT-Replication-Study)
  const studyTypes = store
    .getQuads(sNode, NS.RDF("type"), null, g)
    .filter(
      (q) =>
        Util.isNamedNode(q.object) && q.object.value !== FORRT_REPLICATION_TYPE,
    )
    .map((q) => ({
      uri: q.object.value,
      label: store.findInternalLabel(q.object.value),
    }));

  // Targeted claim
  const claimUri = store.matchOne(sNode, namedNode(TARGETS_CLAIM), null, g)
    ?.object.value;

  // Scope
  const scope = store.matchOne(sNode, namedNode(HAS_SCOPE), null, g)?.object
    .value;

  // Methodology
  const methodology = store.matchOne(sNode, namedNode(HAS_METHODOLOGY), null, g)
    ?.object.value;

  // Deviation
  const deviation = store.matchOne(sNode, namedNode(HAS_DEVIATION), null, g)
    ?.object.value;

  // Keywords (skos:related, repeatable)
  const keywords = store
    .getQuads(sNode, namedNode(SKOS_RELATED), null, g)
    .filter((q) => Util.isNamedNode(q.object))
    .map((q) => ({
      uri: q.object.value,
      label: store.findInternalLabel(q.object.value),
    }));

  // Discipline
  const disciplineUri = store.matchOne(
    sNode,
    namedNode(HAS_DISCIPLINE),
    null,
    g,
  )?.object.value;

  return {
    studyUri,
    label,
    studyTypes,
    claimUri,
    scope,
    methodology,
    deviation,
    keywords,
    disciplineUri,
  };
}

export function ViewFORRTReplication({ store }: CustomViewerProps) {
  const data = useMemo(() => extractFORRTReplication(store), [store]);
  const { getLabel } = useLabels();

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-violet-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FlaskConical className="h-5 w-5 text-violet-600" />
          FORRT Replication Study
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Label */}
        {data.label && (
          <div>
            <ItemTitle title="Study" className="mb-2" />
            <div className="rounded-md border-l-4 border-violet-400 bg-violet-50 p-4 dark:bg-violet-950/20">
              <p className="text-lg font-medium leading-relaxed">
                {data.label}
              </p>
            </div>
          </div>
        )}

        {/* Study Type */}
        {data.studyTypes.length > 0 && (
          <div>
            <ItemTitle
              title="Study Type"
              icon={<Tag className="h-4 w-4 inline-block mr-1" />}
              className="mb-2"
            />
            <div className="flex flex-wrap gap-2">
              {data.studyTypes.map((st) => (
                <a
                  key={st.uri}
                  href={st.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline"
                >
                  <Badge
                    variant="secondary"
                    className="gap-1 hover:bg-secondary/80"
                  >
                    {st.label || getLabel(st.uri)}
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Targeted Claim */}
        {data.claimUri && (
          <RelatedNanopubLink
            uri={data.claimUri}
            label={getLabel(data.claimUri)}
            href={toScienceLiveNPUri(data.claimUri)}
            title="Targets Claim"
          />
        )}

        {/* Scope */}
        {data.scope && (
          <CommentBlock text={data.scope} title="Scope" showIcon={false} />
        )}

        {/* Methodology */}
        {data.methodology && (
          <CommentBlock
            text={data.methodology}
            title="Methodology"
            showIcon={false}
          />
        )}

        {/* Deviation */}
        {data.deviation && (
          <CommentBlock
            text={data.deviation}
            title="Deviations"
            showIcon={false}
          />
        )}

        {/* Keywords */}
        {data.keywords.length > 0 && (
          <div>
            <ItemTitle
              title="Keywords"
              icon={<Tag className="h-4 w-4 inline-block mr-1" />}
              className="mb-2"
            />
            <div className="flex flex-wrap gap-2">
              {data.keywords.map((kw) => (
                <a
                  key={kw.uri}
                  href={kw.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline"
                >
                  <Badge
                    variant="secondary"
                    className="gap-1 hover:bg-secondary/80"
                  >
                    {kw.label || getLabel(kw.uri)}
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Discipline */}
        {data.disciplineUri && (
          <div>
            <ItemTitle title="Discipline" className="mb-2" />
            <ExternalUriLink
              uri={data.disciplineUri}
              label={getLabel(data.disciplineUri)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
