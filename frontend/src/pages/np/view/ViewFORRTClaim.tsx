/**
 * ViewFORRTClaim
 *
 * User-friendly view for nanopubs created with the "FORRT Claim" template.
 * Displays the claim label, FORRT type, linked AIDA sentence, and optional source.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { toScienceLiveNPUri } from "@/lib/uri";
import { GraduationCap, Tag } from "lucide-react";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "../create/components/NanopubViewer";
import {
  ExternalUriLink,
  ItemTitle,
  RelatedNanopubLink,
  ScientificClaimBlock,
} from "./shared-components";

const { namedNode } = DataFactory;

const FORRT_CLAIM_TYPE = "https://w3id.org/sciencelive/o/terms/FORRT-Claim";
const AS_AIDA_STATEMENT =
  "https://w3id.org/sciencelive/o/terms/asAidaStatement";
// --- FORRT Claim extraction ------------------------------------------------

interface FORRTClaimData {
  /** The claim subject URI */
  claimUri: string;
  /** Human-readable label for the claim */
  label?: string;
  /** FORRT type URIs (e.g. computational_performance, scalability) */
  forrtTypes: { uri: string; label?: string }[];
  /** Linked AIDA sentence URI */
  aidaSentenceUri?: string;
  /** Decoded AIDA sentence text */
  aidaSentenceText?: string;
  /** Optional source URI */
  sourceUri?: string;
}

function extractFORRTClaim(store: NanopubStore): FORRTClaimData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find the claim subject: typed as FORRT-Claim
  const claimTypeQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(FORRT_CLAIM_TYPE),
    assertionGraph,
  );

  if (!claimTypeQuad) return null;

  const claimUri = claimTypeQuad.subject.value;

  // Get the label
  const labelQuad = store.matchOne(
    namedNode(claimUri),
    NS.RDFS("label"),
    null,
    assertionGraph,
  );
  const label = labelQuad?.object.value;

  // Get FORRT types (additional rdf:type values beyond FORRT-Claim)
  const typeQuads = store.getQuads(
    namedNode(claimUri),
    NS.RDF("type"),
    null,
    assertionGraph,
  );
  const forrtTypes = typeQuads
    .filter(
      (q) => Util.isNamedNode(q.object) && q.object.value !== FORRT_CLAIM_TYPE,
    )
    .map((q) => ({
      uri: q.object.value,
      label: store.findInternalLabel(q.object.value),
    }));

  // Get linked AIDA sentence
  const aidaQuad = store.matchOne(
    namedNode(claimUri),
    namedNode(AS_AIDA_STATEMENT),
    null,
    assertionGraph,
  );
  const aidaSentenceUri = aidaQuad?.object.value;

  // Try to decode AIDA sentence text from the URI
  let aidaSentenceText: string | undefined;
  if (aidaSentenceUri) {
    try {
      const aidaPrefix = "http://purl.org/aida/";
      if (aidaSentenceUri.startsWith(aidaPrefix)) {
        aidaSentenceText = decodeURIComponent(
          aidaSentenceUri.substring(aidaPrefix.length).replaceAll("+", " "),
        );
      }
    } catch {
      // Keep undefined if decoding fails
    }
  }

  // Get optional source
  const sourceQuad = store.matchOne(
    namedNode(claimUri),
    NS.DCT("source"),
    null,
    assertionGraph,
  );
  const sourceUri = sourceQuad?.object.value;

  return {
    claimUri,
    label,
    forrtTypes,
    aidaSentenceUri,
    aidaSentenceText,
    sourceUri,
  };
}

export function ViewFORRTClaim({ store }: CustomViewerProps) {
  const data = useMemo(() => extractFORRTClaim(store), [store]);

  const { getLabel } = useLabels();

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-violet-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <GraduationCap className="h-5 w-5 text-violet-600" />
          FORRT Claim
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Claim Label */}
        {data.label && (
          <ScientificClaimBlock
            text={data.label}
            title="Claim"
            colorClass="border-violet-400"
            bgClass="bg-violet-50 dark:bg-violet-950/20"
          />
        )}

        {/* FORRT Types */}
        {data.forrtTypes.length > 0 && (
          <div>
            <ItemTitle
              title="FORRT Type"
              icon={<Tag className="h-4 w-4 inline-block mr-1" />}
              className="mb-2"
            />
            <div className="flex flex-wrap gap-2">
              {data.forrtTypes.map((ft) => (
                <a
                  key={ft.uri}
                  href={ft.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline"
                >
                  <Badge
                    variant="secondary"
                    className="gap-1 hover:bg-secondary/80"
                  >
                    {ft.label || getLabel(ft.uri)}
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Linked AIDA Sentence */}
        {data.aidaSentenceUri && (
          <div>
            <ItemTitle title="AIDA Sentence" className="mb-2" />
            {data.aidaSentenceText ? (
              <ScientificClaimBlock
                text={data.aidaSentenceText}
                title=""
                colorClass="border-emerald-400"
                bgClass="bg-emerald-50 dark:bg-emerald-950/20"
              />
            ) : (
              <RelatedNanopubLink
                uri={data.aidaSentenceUri}
                label={getLabel(data.aidaSentenceUri)}
                href={toScienceLiveNPUri(data.aidaSentenceUri)}
                title=""
              />
            )}
          </div>
        )}

        {/* Source */}
        {data.sourceUri && (
          <div>
            <ItemTitle title="Source" className="mb-2" />
            <ExternalUriLink
              uri={data.sourceUri}
              label={getLabel(data.sourceUri)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
