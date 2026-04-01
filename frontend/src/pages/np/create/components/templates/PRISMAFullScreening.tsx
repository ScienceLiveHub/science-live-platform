import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

export default function PRISMAFullScreening({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const schema = z.object({
    review: z.string().url("Must be a valid URI"),
    study: z.string().min(1, "Study is required"),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "review",
        type: "text",
        label: "Review URI",
        placeholder: "https://...",
        required: true,
        description:
          "URI of the systematic review or screening dataset",
      },
      {
        name: "study",
        type: "text",
        label: "Study",
        placeholder: "Select or enter the URI of the study to select for full screening...",
        required: true,
        description:
          "URI of the study to be selected for full-text screening",
      },
      ...NanopubEditorOptionFields,
    ],
    globalWrapper: ShowOptionalWrapper,
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        review: "",
        study: "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        await submit(value);
      },
    },
  });

  return <Form />;
}
