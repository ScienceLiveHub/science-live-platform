import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import { validUriPlaceholder } from "@/lib/validation";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

export default function PICOResearchQuestion({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const schema = z.object({
    pico: validUriPlaceholder,
    label: z.string().min(5).max(200),
    description: z.string().min(10).max(1000),
    populationDescription: z.string().min(5).max(500),
    interventionGroupDescription: z.string().min(5).max(500),
    comparatorGroupDescription: z.string().min(5).max(500),
    outcomeGroupDescription: z.string().min(5).max(500),
    type: z.enum([
      "Causation",
      "Descriptive",
      "Effectiveness",
      "Experience",
      "Prediction",
    ]),
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
        label: "Research Question Label",
        placeholder: "Enter a short label for your research question",
        required: true,
      },
      {
        name: "description",
        type: "textarea",
        label: "Research Question Description",
        placeholder: "Describe your research question in detail",
        required: true,
      },
      {
        name: "type",
        type: "radio",
        label: "Question Type",
        required: true,
        options: [
          { value: "Causation", label: "Causation" },
          { value: "Descriptive", label: "Descriptive" },
          { value: "Effectiveness", label: "Effectiveness" },
          { value: "Experience", label: "Experience" },
          { value: "Prediction", label: "Prediction" },
        ],
        section: {
          title: "Question Classification",
        },
      },
      {
        name: "populationDescription",
        type: "textarea",
        label: "Population",
        placeholder: "Describe the population or problem being addressed",
        required: true,
        section: {
          title: "PICO Components",
        },
      },
      {
        name: "interventionGroupDescription",
        type: "textarea",
        label: "Intervention",
        placeholder: "Describe the intervention or exposure being considered",
        required: true,
      },
      {
        name: "comparatorGroupDescription",
        type: "textarea",
        label: "Comparator",
        placeholder:
          "Describe the comparison or control group (if applicable)",
        required: true,
      },
      {
        name: "outcomeGroupDescription",
        type: "textarea",
        label: "Outcome",
        placeholder: "Describe the expected or measured outcome",
        required: true,
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
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        await submit(value);
      },
    },
  });

  return <Form />;
}
