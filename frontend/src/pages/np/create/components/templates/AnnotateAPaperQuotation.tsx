import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import { validDoi } from "@/lib/validation";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

export default function AnnotateAPaperQuotation({
  publish,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  /**
   * The Schema for types, validation, and error messages
   */
  const schema = z.object({
    paper: validDoi, // The "https://doi.org/" prefix is prepended when published.
    quoteType: z.enum(["whole", "ends"]),
    quotation: z.string().min(5).max(500),
    "quotation-end": z.string().min(5).max(500).optional(),
    comment: z.string().min(5).max(500),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "paper",
        type: "text",
        label: "Cited DOI",
        placeholder: "DOI, starting with 10.",
        required: true,
      },
      {
        name: "quoteType",
        type: "radio",
        options: [
          {
            value: "whole",
            label: "Quote whole text (less than 500 characters)",
          },
          { value: "ends", label: "Quote start/end" },
        ],
      },
      {
        name: "quotation",
        type: "textarea",
        label: "Quoted Text",
        placeholder: "The exact quotation from the paper",
        required: true,
        textareaConfig: {},
      },
      {
        name: "quotation-end",
        type: "textarea",
        label: "Quoted Text End",
        description: "Use when quoting beginning and end of a longer passage",
        placeholder: "The exact quotation from the paper",
        textareaConfig: {},
        conditional: (values) => values.quoteType === "ends",
      },
      {
        name: "comment",
        type: "textarea",
        label: "Comment",
        description:
          "Our interpretation or explanation of why this quotation is relevant",
        placeholder: "Comment, interpretation or explanation",
        required: true,
        textareaConfig: {},
      },
      ...NanopubEditorOptionFields,
    ],
    globalWrapper: ShowOptionalWrapper,
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        paper: "",
        quoteType: "whole",
        quotation: "",
        comment: "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        await publish(value);
      },
    },
  });
  return <Form />;
}
