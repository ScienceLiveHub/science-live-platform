/**
 * ViewPICOResearchQuestion
 *
 * User-friendly view for nanopubs created with PICO Research Question templates.
 * Supports two template variants:
 * 1. Cochrane PICO template (RA5e5XeXy_-aNK5giB7kBAEQslTLVydHeM4YYEzhmEE2w)
 * 2. Alternative PICO template (RAfZfE1gbUtc35W7xT12XTO0ptZwycN2-jj7Jow6COAoQ)
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

// ============================================================================
// Cochrane PICO Template Predicates
// Template: https://w3id.org/np/RA5e5XeXy_-aNK5giB7kBAEQslTLVydHeM4YYEzhmEE2w
// ============================================================================
const PICO_NS = "http://data.cochrane.org/ontologies/pico/";
const COCHRANE_PICO = {
  type: namedNode(PICO_NS + "PICO"),
  population: namedNode(PICO_NS + "population"),
  interventionGroup: namedNode(PICO_NS + "interventionGroup"),
  comparatorGroup: namedNode(PICO_NS + "comparatorGroup"),
  outcomeGroup: namedNode(PICO_NS + "outcomeGroup"),
};

// ============================================================================
// Alternative PICO Template Predicates
// Template: https://w3id.org/np/RAfZfE1gbUtc35W7xT12XTO0ptZwycN2-jj7Jow6COAoQ
// Uses Dublin Core and Schema.org vocabularies
// ============================================================================
const ALT_PICO = {
  title: namedNode("http://purl.org/dc/terms/title"),
  audience: namedNode("http://purl.org/dc/terms/audience"),      // Population
  subject: namedNode("http://purl.org/dc/terms/subject"),        // Intervention
  relation: namedNode("http://purl.org/dc/terms/relation"),      // Comparator
  expectedResult: namedNode("http://schema.org/expectedResult"), // Outcome
  type: namedNode("http://purl.org/dc/terms/type"),              // Question type
  comment: namedNode("http://www.w3.org/2000/01/rdf-schema#comment"), // Rationale
};

// Science Live ontology base URI for question types
const SL_TERMS = "https://w3id.org/sciencelive/o/terms/";

// Question type mappings: suffix -> { label, uri }
const QUESTION_TYPES: Record<string, { label: string; uri: string }> = {
  "CausationResearchQuestion": { label: "Causation", uri: SL_TERMS + "CausationResearchQuestion" },
  "CausationResearchQuestions": { label: "Causation", uri: SL_TERMS + "CausationResearchQuestion" },
  "DescriptiveResearchQuestion": { label: "Descriptive", uri: SL_TERMS + "DescriptiveResearchQuestion" },
  "DescriptiveResearchQuestions": { label: "Descriptive", uri: SL_TERMS + "DescriptiveResearchQuestion" },
  "EffectivenessResearchQuestion": { label: "Effectiveness", uri: SL_TERMS + "EffectivenessResearchQuestion" },
  "EffectivenessResearchQuestions": { label: "Effectiveness", uri: SL_TERMS + "EffectivenessResearchQuestion" },
  "ExperienceResearchQuestion": { label: "Experience", uri: SL_TERMS + "ExperienceResearchQuestion" },
  "ExperienceResearchQuestions": { label: "Experience", uri: SL_TERMS + "ExperienceResearchQuestion" },
  "PredictionResearchQuestion": { label: "Prediction", uri: SL_TERMS + "PredictionResearchQuestion" },
  "PredictionResearchQuestions": { label: "Prediction", uri: SL_TERMS + "PredictionResearchQuestion" },
  // Alternative template uses lowercase
  "causation": { label: "Causation", uri: SL_TERMS + "CausationResearchQuestion" },
  "descriptive": { label: "Descriptive", uri: SL_TERMS + "DescriptiveResearchQuestion" },
  "effectiveness": { label: "Effectiveness", uri: SL_TERMS + "EffectivenessResearchQuestion" },
  "experience": { label: "Experience", uri: SL_TERMS + "ExperienceResearchQuestion" },
  "prediction": { label: "Prediction", uri: SL_TERMS + "PredictionResearchQuestion" },
};

interface PICOData {
  label: string;
  description?: string;
  questionType?: string;
  questionTypeUri?: string;
  rationale?: string;
  population?: string;
  intervention?: string;
  comparator?: string;
  outcome?: string;
}

/**
 * Extract PICO data from Cochrane template
 * Uses pico: namespace predicates with nested blank nodes
 */
function extractCochranePICO(store: NanopubStore): PICOData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find the main PICO entity by looking for rdf:type pico:PICO
  const picoTypeQuad = store.matchOne(
    null,
    NS.RDF("type"),
    COCHRANE_PICO.type,
    assertionGraph,
  );

  let mainSubject: string | null = null;

  if (picoTypeQuad && Util.isNamedNode(picoTypeQuad.subject)) {
    mainSubject = picoTypeQuad.subject.value;
  } else {
    // Fallback: look for subjects with PICO predicates
    for (const predicate of [
      COCHRANE_PICO.population,
      COCHRANE_PICO.interventionGroup,
      COCHRANE_PICO.comparatorGroup,
      COCHRANE_PICO.outcomeGroup,
    ]) {
      const quad = store.matchOne(null, predicate, null, assertionGraph);
      if (quad && Util.isNamedNode(quad.subject)) {
        mainSubject = quad.subject.value;
        break;
      }
    }
  }

  if (!mainSubject) return null;

  const subject = namedNode(mainSubject);

  // Extract label (rdfs:label)
  const labelQuad = store.matchOne(subject, NS.RDFS("label"), null, assertionGraph);
  const label = labelQuad?.object.value || "PICO Research Question";

  // Extract description (dct:description)
  const descQuad = store.matchOne(subject, NS.DCT("description"), null, assertionGraph);
  const description = descQuad?.object.value;

  // Helper to extract component description from nested blank node
  const getComponentDescription = (predicate: typeof COCHRANE_PICO.population): string | undefined => {
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
  const population = getComponentDescription(COCHRANE_PICO.population);
  const intervention = getComponentDescription(COCHRANE_PICO.interventionGroup);
  const comparator = getComponentDescription(COCHRANE_PICO.comparatorGroup);
  const outcome = getComponentDescription(COCHRANE_PICO.outcomeGroup);

  // Extract question type from rdf:type
  const typeQuads = store.getQuads(subject, NS.RDF("type"), null, assertionGraph);
  let questionType: string | undefined;
  let questionTypeUri: string | undefined;
  for (const q of typeQuads) {
    const typeUri = q.object.value;
    if (typeUri.includes("sciencelive/o/terms/")) {
      const typeName = typeUri.split("/").pop();
      if (typeName && QUESTION_TYPES[typeName]) {
        questionType = QUESTION_TYPES[typeName].label;
        questionTypeUri = QUESTION_TYPES[typeName].uri;
        break;
      }
    }
  }

  return {
    label,
    description,
    questionType,
    questionTypeUri,
    population,
    intervention,
    comparator,
    outcome,
  };
}

/**
 * Extract PICO data from alternative template
 * Uses Dublin Core and Schema.org predicates directly on subject
 */
function extractAlternativePICO(store: NanopubStore): PICOData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find subject by looking for dct:title or dct:audience
  let mainSubject: string | null = null;

  const titleQuad = store.matchOne(null, ALT_PICO.title, null, assertionGraph);
  if (titleQuad && Util.isNamedNode(titleQuad.subject)) {
    mainSubject = titleQuad.subject.value;
  } else {
    const audienceQuad = store.matchOne(null, ALT_PICO.audience, null, assertionGraph);
    if (audienceQuad && Util.isNamedNode(audienceQuad.subject)) {
      mainSubject = audienceQuad.subject.value;
    }
  }

  if (!mainSubject) return null;

  const subject = namedNode(mainSubject);

  // Extract fields directly from the subject
  const getLiteralValue = (predicate: ReturnType<typeof namedNode>): string | undefined => {
    const quad = store.matchOne(subject, predicate, null, assertionGraph);
    return quad?.object.value;
  };

  const label = getLiteralValue(ALT_PICO.title) || "PICO Research Question";
  const description = getLiteralValue(NS.DCT("description"));
  const rationale = getLiteralValue(ALT_PICO.comment);
  const population = getLiteralValue(ALT_PICO.audience);
  const intervention = getLiteralValue(ALT_PICO.subject);
  const comparator = getLiteralValue(ALT_PICO.relation);
  const outcome = getLiteralValue(ALT_PICO.expectedResult);

  // Extract question type from dct:type
  let questionType: string | undefined;
  let questionTypeUri: string | undefined;
  const typeQuad = store.matchOne(subject, ALT_PICO.type, null, assertionGraph);
  if (typeQuad) {
    const typeValue = typeQuad.object.value;
    // Extract type name from URI or use literal directly
    const typeName = typeValue.includes("/") ? typeValue.split("/").pop() : typeValue;
    if (typeName && QUESTION_TYPES[typeName]) {
      questionType = QUESTION_TYPES[typeName].label;
      questionTypeUri = QUESTION_TYPES[typeName].uri;
    }
  }

  return {
    label,
    description,
    questionType,
    questionTypeUri,
    rationale,
    population,
    intervention,
    comparator,
    outcome,
  };
}

/**
 * Main extraction function - tries both template strategies
 */
function extractPICOData(store: NanopubStore): PICOData | null {
  // Try Cochrane template first
  const cochraneData = extractCochranePICO(store);
  if (cochraneData && (cochraneData.population || cochraneData.intervention)) {
    return cochraneData;
  }

  // Fall back to alternative template
  return extractAlternativePICO(store);
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
          {data.questionType && (
            data.questionTypeUri ? (
              <a
                href={data.questionTypeUri}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2"
              >
                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                  {data.questionType}
                </Badge>
              </a>
            ) : (
              <Badge variant="secondary" className="ml-2">
                {data.questionType}
              </Badge>
            )
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Question Label & Description */}
        <div>
          <ItemTitle title="Research Question" className="mb-2" />
          <div className="rounded-md border-l-4 border-indigo-400 bg-indigo-50 p-4 dark:bg-indigo-950/20">
            <p className="text-lg font-medium leading-relaxed">{data.label}</p>
          </div>
          {data.description && (
            <p className="mt-3 text-muted-foreground">{data.description}</p>
          )}
        </div>

        {/* PICO Components */}
        <div className="grid gap-4 md:grid-cols-2">
          {data.population && (
            <CommentBlock
              text={data.population}
              title="Population (P)"
              showIcon={false}
            />
          )}
          {data.intervention && (
            <CommentBlock
              text={data.intervention}
              title="Intervention (I)"
              showIcon={false}
            />
          )}
          {data.comparator && (
            <CommentBlock
              text={data.comparator}
              title="Comparator (C)"
              showIcon={false}
            />
          )}
          {data.outcome && (
            <CommentBlock
              text={data.outcome}
              title="Outcome (O)"
              showIcon={false}
            />
          )}
        </div>

        {/* Rationale (from alternative template) */}
        {data.rationale && (
          <div>
            <ItemTitle title="Background & Rationale" className="mb-2" />
            <p className="text-muted-foreground">{data.rationale}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
