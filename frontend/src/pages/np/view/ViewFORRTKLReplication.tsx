/**
 * ViewFORRTKLReplication
 *
 * User-friendly view for nanopubs created with the
 * "FORRT Replication Study with Knowledge Loom metadata" template.
 *
 * Extends ViewFORRTReplication with Knowledge Loom fields:
 * software method, package, runtime, input data, script, and loom record.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { toScienceLiveNPUri } from "@/lib/uri";
import { Code, FlaskConical, Tag } from "lucide-react";
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

// Knowledge Loom predicates
const EXECUTES_METHOD = "https://w3id.org/sciencelive/o/terms/executesMethod";
const USES_SOFTWARE_PACKAGE =
  "https://w3id.org/sciencelive/o/terms/usesSoftwarePackage";
const HAS_RUNTIME = "https://w3id.org/sciencelive/o/terms/hasRuntimeEnvironment";
const HAS_INPUT_SOURCE =
  "https://w3id.org/sciencelive/o/terms/hasInputDataSource";
const HAS_INPUT_DESC =
  "https://w3id.org/sciencelive/o/terms/hasInputDataDescription";
const HAS_ANALYSIS_SCRIPT =
  "https://w3id.org/sciencelive/o/terms/hasAnalysisScript";
const HAS_LOOM_RECORD = "https://w3id.org/sciencelive/o/terms/hasLoomRecord";

interface FORRTKLReplicationData {
  studyUri: string;
  label?: string;
  studyTypes: { uri: string; label?: string }[];
  claimUri?: string;
  scope?: string;
  methodology?: string;
  deviation?: string;
  keywords: { uri: string; label?: string }[];
  disciplineUri?: string;
  // Knowledge Loom fields
  method?: string;
  softwarePackage?: string;
  runtime?: string;
  inputSource?: string;
  inputDesc?: string;
  analysisScript?: string;
  loomRecord?: string;
}

function extractData(store: NanopubStore): FORRTKLReplicationData | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);

  const studyQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(FORRT_REPLICATION_TYPE),
    g,
  );
  if (!studyQuad) return null;
  const studyUri = studyQuad.subject.value;
  const s = namedNode(studyUri);

  const label = store.matchOne(s, NS.RDFS("label"), null, g)?.object.value;

  const studyTypes = store
    .getQuads(s, NS.RDF("type"), null, g)
    .filter(
      (q) =>
        Util.isNamedNode(q.object) && q.object.value !== FORRT_REPLICATION_TYPE,
    )
    .map((q) => ({
      uri: q.object.value,
      label: store.findInternalLabel(q.object.value),
    }));

  const claimUri = store.matchOne(s, namedNode(TARGETS_CLAIM), null, g)?.object
    .value;
  const scope = store.matchOne(s, namedNode(HAS_SCOPE), null, g)?.object.value;
  const methodology = store.matchOne(s, namedNode(HAS_METHODOLOGY), null, g)
    ?.object.value;
  const deviation = store.matchOne(s, namedNode(HAS_DEVIATION), null, g)?.object
    .value;
  const keywords = store
    .getQuads(s, namedNode(SKOS_RELATED), null, g)
    .filter((q) => Util.isNamedNode(q.object))
    .map((q) => ({
      uri: q.object.value,
      label: store.findInternalLabel(q.object.value),
    }));
  const disciplineUri = store.matchOne(s, namedNode(HAS_DISCIPLINE), null, g)
    ?.object.value;

  // Knowledge Loom fields
  const method = store.matchOne(s, namedNode(EXECUTES_METHOD), null, g)?.object
    .value;
  const softwarePackage = store.matchOne(
    s,
    namedNode(USES_SOFTWARE_PACKAGE),
    null,
    g,
  )?.object.value;
  const runtime = store.matchOne(s, namedNode(HAS_RUNTIME), null, g)?.object
    .value;
  const inputSource = store.matchOne(s, namedNode(HAS_INPUT_SOURCE), null, g)
    ?.object.value;
  const inputDesc = store.matchOne(s, namedNode(HAS_INPUT_DESC), null, g)
    ?.object.value;
  const analysisScript = store.matchOne(
    s,
    namedNode(HAS_ANALYSIS_SCRIPT),
    null,
    g,
  )?.object.value;
  const loomRecord = store.matchOne(s, namedNode(HAS_LOOM_RECORD), null, g)
    ?.object.value;

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
    method,
    softwarePackage,
    runtime,
    inputSource,
    inputDesc,
    analysisScript,
    loomRecord,
  };
}

export function ViewFORRTKLReplication({ store }: CustomViewerProps) {
  const data = useMemo(() => extractData(store), [store]);
  const { getLabel } = useLabels();

  if (!data) return null;

  const hasKLData =
    data.method ||
    data.softwarePackage ||
    data.runtime ||
    data.inputSource ||
    data.inputDesc ||
    data.analysisScript ||
    data.loomRecord;

  return (
    <Card className="border-l-8 border-l-violet-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FlaskConical className="h-5 w-5 text-violet-600" />
          FORRT Replication Study
          <Badge variant="outline" className="ml-2 text-xs">
            Knowledge Loom
          </Badge>
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

        {/* Knowledge Loom Metadata */}
        {hasKLData && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
            <ItemTitle
              title="Knowledge Loom Metadata"
              icon={<Code className="h-4 w-4 inline-block mr-1" />}
              className="mb-3"
            />
            <div className="space-y-2 text-sm">
              {data.method && (
                <div>
                  <span className="font-medium">Method:</span>{" "}
                  <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
                    {data.method}
                  </code>
                </div>
              )}
              {data.softwarePackage && (
                <div>
                  <span className="font-medium">Package:</span>{" "}
                  <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
                    {data.softwarePackage}
                  </code>
                </div>
              )}
              {data.runtime && (
                <div>
                  <span className="font-medium">Runtime:</span>{" "}
                  <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
                    {data.runtime}
                  </code>
                </div>
              )}
              {data.inputDesc && (
                <div>
                  <span className="font-medium">Input data:</span>{" "}
                  {data.inputDesc}
                </div>
              )}
              {data.inputSource && (
                <div>
                  <span className="font-medium">Data source:</span>{" "}
                  <ExternalUriLink uri={data.inputSource} />
                </div>
              )}
              {data.analysisScript && (
                <div>
                  <span className="font-medium">Script:</span>{" "}
                  <ExternalUriLink uri={data.analysisScript} />
                </div>
              )}
              {data.loomRecord && (
                <div>
                  <span className="font-medium">Loom record:</span>{" "}
                  <ExternalUriLink uri={data.loomRecord} />
                </div>
              )}
            </div>
          </div>
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
