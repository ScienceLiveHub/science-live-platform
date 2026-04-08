import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import { validUriPlaceholder } from "@/lib/validation";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

// Question type URIs matching the Cochrane PICO template's RestrictedChoicePlaceholder values
const SL_TERMS = "https://w3id.org/sciencelive/o/terms/";
const QUESTION_TYPES = [
  { value: `${SL_TERMS}CausationResearchQuestion`, label: "Causation (Does factor X cause outcome Y?)" },
  { value: `${SL_TERMS}DescriptiveResearchQuestion`, label: "Descriptive (What are the characteristics of X?)" },
  { value: `${SL_TERMS}EffectivenessResearchQuestions`, label: "Effectiveness (Does approach X work better than Y?)" },
  { value: `${SL_TERMS}ExperienceResearchQuestions`, label: "Experience (How do people experience phenomenon X?)" },
  { value: `${SL_TERMS}PredictionResearchQuestions`, label: "Prediction (What outcomes can we expect from X?)" },
];

export default function PICOResearchQuestion({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  // Field names must match the Cochrane PICO template placeholder names (sub:pico, sub:label, etc.)
  const schema = z.object({
    pico: validUriPlaceholder,
    label: z.string().min(10).max(200),
    description: z.string().min(10).max(1000),
    populationDescription: z.string().min(5).max(500),
    interventionGroupDescription: z.string().min(5).max(500),
    comparatorGroupDescription: z.string().min(5).max(500),
    outcomeGroupDescription: z.string().min(5).max(500),
    type: z.string(),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "pico",
        type: "text",
        label: "Short ID (used as URI suffix)",
        placeholder: "e.g., my-pico-question-2024",
        required: true,
        description:
          "A short identifier for this research question (letters, numbers, hyphens)",
      },
      {
        name: "label",
        type: "text",
        label: "Research Question Title",
        placeholder: "Title of your systematic review research question",
        required: true,
        description: "A concise title for your PICO research question (10-200 characters)",
      },
      {
        name: "description",
        type: "textarea",
        label: "Complete Research Question",
        placeholder: "Write out your complete structured research question...",
        required: true,
        description: "The full structured research question following PICO format",
      },
      {
        name: "type",
        type: "radio",
        label: "Question Type",
        required: true,
        options: QUESTION_TYPES,
        section: {
          title: "Question Classification",
        },
      },
      {
        name: "populationDescription",
        type: "textarea",
        label: "Population (P)",
        placeholder: "Describe the population or participants of interest...",
        required: true,
        description: "Who are you studying? (e.g., adults with Type 2 diabetes)",
        section: {
          title: "PICO Components",
        },
      },
      {
        name: "interventionGroupDescription",
        type: "textarea",
        label: "Intervention (I)",
        placeholder: "Describe the intervention, exposure, or phenomenon of interest...",
        required: true,
        description: "What intervention or exposure are you examining?",
        section: {
          title: "PICO Components",
        },
      },
      {
        name: "comparatorGroupDescription",
        type: "textarea",
        label: "Comparison (C)",
        placeholder: "Describe the comparison group or alternative intervention...",
        required: true,
        description: "What is the comparison or control condition?",
        section: {
          title: "PICO Components",
        },
      },
      {
        name: "outcomeGroupDescription",
        type: "textarea",
        label: "Outcome (O)",
        placeholder: "Describe the primary outcomes of interest...",
        required: true,
        description: "What outcomes are you measuring?",
        section: {
          title: "PICO Components",
        },
      },
      ...NanopubEditorOptionFields,
    ],
    globalWrapper: ShowOptionalWrapper,
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        pico: "",
        label: "",
        description: "",
        populationDescription: "",
        interventionGroupDescription: "",
        comparatorGroupDescription: "",
        outcomeGroupDescription: "",
        type: `${SL_TERMS}EffectivenessResearchQuestions`,
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        await submit(value);
      },
    },
  });

  return <Form />;
}
