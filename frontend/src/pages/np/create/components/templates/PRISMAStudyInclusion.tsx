import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

export default function PRISMAStudyInclusion({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const schema = z.object({
    studyLabel: z.string().min(1, "Study label is required"),
    source: z.string().url("Must be a valid URI (e.g., DOI)"),
    systematicReview: z.string().min(1, "Systematic review is required"),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "studyLabel",
        type: "text",
        label: "Study Label",
        placeholder:
          "e.g., Smith et al. (2024) - Climate migration in coastal regions",
        required: true,
        description: "A descriptive label for the included study",
      },
      {
        name: "source",
        type: "text",
        label: "Source URI",
        placeholder: "https://doi.org/10.1000/example",
        required: true,
        description: "DOI or URI of the paper being included",
      },
      {
        name: "systematicReview",
        type: "text",
        label: "Systematic Review",
        placeholder: "Select or enter the URI of the systematic review...",
        required: true,
        description: "URI of the systematic review this study is included in",
      },
      ...NanopubEditorOptionFields,
    ],
    globalWrapper: ShowOptionalWrapper,
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        studyLabel: "",
        source: "",
        systematicReview: "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        await submit(value);
      },
    },
  });

  return <Form />;
}
