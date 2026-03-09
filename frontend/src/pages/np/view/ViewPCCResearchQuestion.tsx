/**
 * ViewPCCResearchQuestion
 *
 * User-friendly view for nanopubs created with the "PCC Research Question" template.
 * Displays the review question with its Population, Concept, and Context
 * components in a structured format.
 *
 * PCC = Population, Concept, Context
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { ClipboardList } from "lucide-react";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "../create/components/NanopubViewer";
import { CommentBlock, ItemTitle } from "./shared-components";

const { namedNode } = DataFactory;

// PCC namespace - from Science Live ontology
const PCC_NS = "https://w3id.org/sciencelive/o/terms/";
const PCC = {
  type: namedNode(PCC_NS + "PccReviewQuestion"),
  hasPccPopulation: namedNode(PCC_NS + "hasPccPopulation"),
  hasPccConcept: namedNode(PCC_NS + "hasPccConcept"),
  hasPccContext: namedNode(PCC_NS + "hasPccContext"),
};

interface PCCData {
  label: string;
  description?: string;
  population?: string;
  concept?: string;
  context?: string;
}

function extractPCCData(store: NanopubStore): PCCData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find the main PCC entity by looking for rdf:type PccReviewQuestion
  const pccTypeQuad = store.matchOne(
    null,
    NS.RDF("type"),
    PCC.type,
    assertionGraph,
  );

  let mainSubject: string | null = null;

  if (pccTypeQuad && Util.isNamedNode(pccTypeQuad.subject)) {
    mainSubject = pccTypeQuad.subject.value;
  } else {
    // Fallback: look for subjects with PCC predicates
    const labelQuads = store.getQuads(null, NS.RDFS("label"), null, assertionGraph);
    for (const quad of labelQuads) {
      if (Util.isNamedNode(quad.subject)) {
        const hasPopulation = store.matchOne(
          quad.subject,
          PCC.hasPccPopulation,
          null,
          assertionGraph,
        );
        if (hasPopulation) {
          mainSubject = quad.subject.value;
          break;
        }
      }
    }
  }

  if (!mainSubject) return null;

  const subject = namedNode(mainSubject);

  // Extract label
  const labelQuad = store.matchOne(subject, NS.RDFS("label"), null, assertionGraph);
  const label = labelQuad?.object.value || "PCC Review Question";

  // Extract description (dct:description - DC Terms)
  const descQuad = store.matchOne(subject, NS.DCT("description"), null, assertionGraph);
  const description = descQuad?.object.value;

  // Helper to extract component description
  const getComponentDescription = (predicate: typeof PCC.hasPccPopulation): string | undefined => {
    const componentQuad = store.matchOne(subject, predicate, null, assertionGraph);
    if (!componentQuad || !Util.isNamedNode(componentQuad.object)) return undefined;

    const componentUri = namedNode(componentQuad.object.value);
    // Try dct:description first, then dc:description
    let descriptionQuad = store.matchOne(
      componentUri,
      NS.DCT("description"),
      null,
      assertionGraph,
    );
    if (!descriptionQuad) {
      descriptionQuad = store.matchOne(componentUri, namedNode("http://purl.org/dc/elements/1.1/description"), null, assertionGraph);
    }
    return descriptionQuad?.object.value;
  };

  // Extract PCC components
  const population = getComponentDescription(PCC.hasPccPopulation);
  const concept = getComponentDescription(PCC.hasPccConcept);
  const context = getComponentDescription(PCC.hasPccContext);

  return {
    label,
    description,
    population,
    concept,
    context,
  };
}

export function ViewPCCResearchQuestion({ store }: CustomViewerProps) {
  const data = useMemo(() => extractPCCData(store), [store]);

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-cyan-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5 text-cyan-600" />
          PCC Review Question
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Question Label & Description */}
        <div>
          <ItemTitle title="Review Question" className="mb-2" />
          <p className="text-lg font-medium">{data.label}</p>
          {data.description && (
            <p className="mt-2 text-muted-foreground">{data.description}</p>
          )}
        </div>

        {/* PCC Components */}
        <div className="grid gap-4 md:grid-cols-3">
          {data.population && (
            <CommentBlock
              text={data.population}
              title="Population"
              showIcon={false}
            />
          )}
          {data.concept && (
            <CommentBlock
              text={data.concept}
              title="Concept"
              showIcon={false}
            />
          )}
          {data.context && (
            <CommentBlock
              text={data.context}
              title="Context"
              showIcon={false}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
