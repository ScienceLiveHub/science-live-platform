import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import { validUriPlaceholder } from "@/lib/validation";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

// Question type options matching the template
const QUESTION_TYPES = [
  { value: "causation", label: "Causation (Does factor X cause outcome Y?)" },
  { value: "descriptive", label: "Descriptive (What are the characteristics of X?)" },
  { value: "effectiveness", label: "Effectiveness (Does approach X work better than Y?)" },
  { value: "experience", label: "Experience (How do people experience phenomenon X?)" },
  { value: "prediction", label: "Prediction (What outcomes can we expect from X?)" },
];

export default function PICOResearchQuestion({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const schema = z.object({
    "research-question": validUriPlaceholder,
    "question-title": z.string().min(10).max(200),
    "structured-question-text": z.string().min(10).max(1000),
    "target-population": z.string().min(5).max(500),
    "intervention-focus": z.string().min(5).max(500),
    "comparison-group": z.string().min(5).max(500),
    "primary-outcomes": z.string().min(5).max(500),
    "question-type": z.string(),
    "rationale-text": z.string().min(10).max(2000).optional().or(z.literal("")),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "research-question",
        type: "text",
        label: "Short ID (used as URI suffix)",
        placeholder: "e.g., my-pico-question-2024",
        required: true,
        description:
          "A short identifier for this research question (letters, numbers, hyphens)",
      },
      {
        name: "question-title",
        type: "text",
        label: "Research Question Title",
        placeholder: "Title of your systematic review research question",
        required: true,
        description: "A concise title for your PICO research question (10-200 characters)",
      },
      {
        name: "structured-question-text",
        type: "textarea",
        label: "Complete Research Question",
        placeholder: "Write out your complete structured research question...",
        required: true,
        description: "The full structured research question following PICO format",
      },
      {
        name: "question-type",
        type: "radio",
        label: "Question Type",
        required: true,
        options: QUESTION_TYPES,
        section: {
          title: "Question Classification",
        },
      },
      {
        name: "target-population",
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
        name: "intervention-focus",
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
        name: "comparison-group",
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
        name: "primary-outcomes",
        type: "textarea",
        label: "Outcome (O)",
        placeholder: "Describe the primary outcomes of interest...",
        required: true,
        description: "What outcomes are you measuring?",
        section: {
          title: "PICO Components",
        },
      },
      {
        name: "rationale-text",
        type: "textarea",
        label: "Background & Rationale",
        placeholder: "Provide background and rationale for this research question...",
        required: false,
        description: "Why is this research question important?",
        section: {
          title: "Additional Information",
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
        "research-question": "",
        "question-title": "",
        "structured-question-text": "",
        "target-population": "",
        "intervention-focus": "",
        "comparison-group": "",
        "primary-outcomes": "",
        "question-type": "effectiveness",
        "rationale-text": "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        await submit(value);
      },
    },
  });

  return <Form />;
}
