/**
 * ViewReplicationRequest
 *
 * User-friendly view for nanopubs created with the "Request a replication" template
 * (`RAo1X8qf…`): a `schema:CheckAction` with `schema:PotentialActionStatus` whose
 * `schema:object` is the Quote-with-comment nanopub stating the claim. Shows the
 * claim to check, what should be done (reproduction / replication / both), and the
 * suggested datasets, software and approach.
 */

import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { toScienceLiveNPUri } from "@/lib/uri";
import { DataFactory } from "n3";
import { useMemo } from "react";
import {
  TEMPLATE_METADATA,
  TEMPLATE_URI,
  getTemplateBorderClass,
  getTemplateColorClass,
} from "../create/components/templates/registry-metadata";
import { STUDY_TYPE_OPTIONS } from "../create/components/templates/study-type-options";
import { CustomViewerProps } from "./NanopubViewer";
import {
  CommentBlock,
  ExternalUriLink,
  ItemTitle,
  RelatedNanopubLink,
} from "./shared-components";
import { TEMPLATE_VIEW_ICONS } from "./view-registry";

const { namedNode } = DataFactory;

const SCHEMA = (local: string) => namedNode(`https://schema.org/${local}`);
const SL = (local: string) =>
  namedNode(`https://w3id.org/sciencelive/o/terms/${local}`);

interface ReplicationRequestData {
  quote: string;
  studyType: string;
  datasets: string[];
  software: string[];
  approach: string;
}

function extractReplicationRequest(
  store: NanopubStore,
): ReplicationRequestData | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);
  const objectQuad = store.matchOne(null, SCHEMA("object"), null, g);
  if (!objectQuad) return null;
  const request = objectQuad.subject;
  const values = (p: ReturnType<typeof namedNode>) =>
    store.getQuads(request, p, null, g).map((q) => q.object.value);
  return {
    quote: objectQuad.object.value,
    studyType: values(SCHEMA("additionalType"))[0] ?? "",
    datasets: values(SL("hasInputDataSource")),
    software: values(SL("usesSoftwarePackage")),
    approach: values(SCHEMA("description"))[0] ?? "",
  };
}

export function ViewReplicationRequest({ store }: CustomViewerProps) {
  const data = useMemo(() => extractReplicationRequest(store), [store]);
  const { resolvedTheme } = useTheme();
  const { getLabel } = useLabels();

  if (!data) return null;

  const Icon = TEMPLATE_VIEW_ICONS[TEMPLATE_URI.REPLICATION_REQUEST];
  const color = TEMPLATE_METADATA[TEMPLATE_URI.REPLICATION_REQUEST].color!;
  const studyTypeLabel =
    STUDY_TYPE_OPTIONS.find((o) => o.value === data.studyType)?.label ??
    "Reproduction or replication (either is fine)";

  return (
    <Card
      className={`border-l-8 ${getTemplateBorderClass(color, resolvedTheme)}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon
            className={`h-5 w-5 ${getTemplateColorClass(color, resolvedTheme)}`}
          />
          Replication requested
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <RelatedNanopubLink
          uri={data.quote}
          href={toScienceLiveNPUri(data.quote)}
          label={getLabel(data.quote) || data.quote}
          title="Claim to check (quote and why it matters)"
        />

        <div>
          <ItemTitle title="What should be done" />
          <p className="text-sm">{studyTypeLabel}</p>
        </div>

        {data.datasets.length > 0 && (
          <div>
            <ItemTitle title="Suggested datasets" />
            <ul className="flex flex-col gap-1 text-sm">
              {data.datasets.map((d) => (
                <li key={d}>
                  <ExternalUriLink uri={d} label={getLabel(d) || d} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.software.length > 0 && (
          <div>
            <ItemTitle title="Suggested software" />
            <ul className="flex flex-col gap-1 text-sm">
              {data.software.map((s) => (
                <li key={s}>
                  {/^https?:\/\//.test(s) ? (
                    <ExternalUriLink uri={s} label={getLabel(s) || s} />
                  ) : (
                    s
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.approach && (
          <CommentBlock text={data.approach} title="Suggested approach" />
        )}
      </CardContent>
    </Card>
  );
}
