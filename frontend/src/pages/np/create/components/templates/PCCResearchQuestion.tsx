import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import { validUriPlaceholder } from "@/lib/validation";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

export default function PCCResearchQuestion({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const schema = z.object({
    reviewQuestion: validUriPlaceholder,
    label: z.string().min(5).max(200),
    description: z.string().min(10).max(1000),
    populationDescription: z.string().min(5).max(500),
    conceptDescription: z.string().min(5).max(500),
    contextDescription: z.string().min(5).max(500),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "reviewQuestion",
        type: "text",
        label: "Short ID (used as URI suffix)",
        placeholder: "e.g., my-review-question-2024",
        required: true,
        description:
          "A short identifier for this review question (letters, numbers, hyphens)",
      },
      {
        name: "label",
        type: "text",
        label: "Review Question Label",
        placeholder: "Enter a short label for your review question",
        required: true,
      },
      {
        name: "description",
        type: "textarea",
        label: "Review Question Description",
        placeholder: "Describe your review question in detail",
        required: true,
      },
      {
        name: "populationDescription",
        type: "textarea",
        label: "Population",
        placeholder: "Describe the population or participants being studied",
        required: true,
        section: {
          title: "PCC Components",
        },
      },
      {
        name: "conceptDescription",
        type: "textarea",
        label: "Concept",
        placeholder: "Describe the core concept or phenomenon being examined",
        required: true,
      },
      {
        name: "contextDescription",
        type: "textarea",
        label: "Context",
        placeholder:
          "Describe the context or setting in which the review is conducted",
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
        reviewQuestion: "",
        label: "",
        description: "",
        populationDescription: "",
        conceptDescription: "",
        contextDescription: "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        await submit(value);
      },
    },
  });

  return <Form />;
}
