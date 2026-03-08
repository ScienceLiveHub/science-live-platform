/**
 * ViewPICOResearchQuestion
 *
 * User-friendly view for nanopubs created with the "PICO Research Question" template.
 * Displays the research question with its Population, Intervention, Comparator,
 * and Outcome components in a structured format.
 *
 * PICO = Population, Intervention, Comparator, Outcome
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { Microscope } from "lucide-react";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "../create/components/NanopubViewer";
import { CommentBlock, ItemTitle } from "./shared-components";

const { namedNode } = DataFactory;

// PICO namespace - from Cochrane ontology
const PICO_NS = "http://data.cochrane.org/ontologies/pico/";
const PICO = {
  type: namedNode(PICO_NS + "PICO"),
  population: namedNode(PICO_NS + "population"),
  interventionGroup: namedNode(PICO_NS + "interventionGroup"),
  comparatorGroup: namedNode(PICO_NS + "comparatorGroup"),
  outcomeGroup: namedNode(PICO_NS + "outcomeGroup"),
};

interface PICOData {
  label: string;
  description?: string;
  type?: string;
  population?: string;
  intervention?: string;
  comparator?: string;
  outcome?: string;
}

function extractPICOData(store: NanopubStore): PICOData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find the main PICO entity by looking for rdf:type pico:PICO
  const picoTypeQuad = store.matchOne(
    null,
    NS.RDF("type"),
    PICO.type,
    assertionGraph,
  );

  let mainSubject: string | null = null;

  if (picoTypeQuad && Util.isNamedNode(picoTypeQuad.subject)) {
    mainSubject = picoTypeQuad.subject.value;
  } else {
    // Fallback: look for subjects with PICO predicates
    const labelQuads = store.getQuads(null, NS.RDFS("label"), null, assertionGraph);
    for (const quad of labelQuads) {
      if (Util.isNamedNode(quad.subject)) {
        const hasPopulation = store.matchOne(
          quad.subject,
          PICO.population,
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
  const label = labelQuad?.object.value || "PICO Research Question";

  // Extract description
  const descQuad = store.matchOne(subject, NS.DCT("description"), null, assertionGraph);
  const description = descQuad?.object.value;

  // Helper to extract component description
  const getComponentDescription = (predicate: typeof PICO.population): string | undefined => {
    const componentQuad = store.matchOne(subject, predicate, null, assertionGraph);
    if (!componentQuad || !Util.isNamedNode(componentQuad.object)) return undefined;

    const componentUri = namedNode(componentQuad.object.value);
    const descriptionQuad = store.matchOne(
      componentUri,
      NS.DCT("description"),
      null,
      assertionGraph,
    );
    return descriptionQuad?.object.value;
  };

  // Extract PICO components
  const population = getComponentDescription(PICO.population);
  const intervention = getComponentDescription(PICO.interventionGroup);
  const comparator = getComponentDescription(PICO.comparatorGroup);
  const outcome = getComponentDescription(PICO.outcomeGroup);

  // Try to find the type
  const typeQuads = store.getQuads(subject, NS.RDF("type"), null, assertionGraph);
  let type: string | undefined;
  for (const q of typeQuads) {
    const typeValue = q.object.value;
    // Extract the type name from URI if it matches known types
    const typeName = typeValue.split(/[/#]/).pop();
    if (["Causation", "Descriptive", "Effectiveness", "Experience", "Prediction"].includes(typeName || "")) {
      type = typeName;
      break;
    }
  }

  return {
    label,
    description,
    type,
    population,
    intervention,
    comparator,
    outcome,
  };
}

export function ViewPICOResearchQuestion({ store }: CustomViewerProps) {
  const data = useMemo(() => extractPICOData(store), [store]);

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-indigo-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Microscope className="h-5 w-5 text-indigo-600" />
          PICO Research Question
          {data.type && (
            <Badge variant="secondary" className="ml-2">
              {data.type}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Question Label & Description */}
        <div>
          <ItemTitle title="Research Question" className="mb-2" />
          <p className="text-lg font-medium">{data.label}</p>
          {data.description && (
            <p className="mt-2 text-muted-foreground">{data.description}</p>
          )}
        </div>

        {/* PICO Components */}
        <div className="grid gap-4 md:grid-cols-2">
          {data.population && (
            <CommentBlock
              text={data.population}
              title="Population"
              showIcon={false}
            />
          )}
          {data.intervention && (
            <CommentBlock
              text={data.intervention}
              title="Intervention"
              showIcon={false}
            />
          )}
          {data.comparator && (
            <CommentBlock
              text={data.comparator}
              title="Comparator"
              showIcon={false}
            />
          )}
          {data.outcome && (
            <CommentBlock
              text={data.outcome}
              title="Outcome"
              showIcon={false}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
