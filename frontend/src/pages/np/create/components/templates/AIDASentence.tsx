import { useFormedible } from "@/hooks/use-formedible";
import z from "zod";
import { NanopubTemplateDefComponentProps } from "./component-registry";

export default function AIDASentence({
  publish,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  /**
   * The Schema for types, validation, and error messages
   */
  const schema = z.object({
    aida: z.string().regex(new RegExp("[\S ]{5,500}\.")),
    topic: z.string().array().optional(), //TODO: guided choice from API
    project: z.string(), //TODO: guided choice from API
    dataset: z.url().optional(),
  });

  /**
   * Construct the form component using Formedible
   * See manual builder: https://formedible.dev/builder or AI tool https://formedible.dev/ai-builder
   */
  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "aida",
        type: "textarea",
        label: "Enter your AIDA sentence here (ending with a full stop)",
        placeholder: "Enter sentence.",
        required: true,
      },
      {
        name: "topic",
        type: "text",
        label: "Topics",
        placeholder: "URI of concept or topic the sentence is about",
        required: false,
        multiple: true,
      },
      {
        name: "project",
        type: "text",
        label: "Relates to this nanopublication",
        placeholder: "URI of nanopublication for related reasearch project",
      },
      {
        name: "dataset",
        type: "text",
        label: "Relates to this nanopublication",
        placeholder: "URI of nanopublication for related dataset",
        required: false,
      },
    ],
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        aida: "",
        topic: [],
        project: "",
        dataset: "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        await publish(value);
      },
    },
  });
  return <Form />;
}
