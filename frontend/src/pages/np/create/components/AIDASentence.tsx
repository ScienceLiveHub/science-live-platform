"use no memo";
"use client";

import { useFormedible } from "@/hooks/use-formedible";
import { toast } from "sonner";
import z from "zod";

export default function AIDASentence() {
  /**
   * The Schema for types, validation, and error messages
   */
  const schema = z.object({
    aidaSentence: z.string().min(5, "Sentence is required"),
    topics: z.string().array().optional(),
    relatedTo: z.string(),
    supportedBy: z.string().optional(),
  });

  /**
   * Construct the form component using Formedible
   * See manual builder: https://formedible.dev/builder or AI tool https://formedible.dev/ai-builder
   */
  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "aidaSentence",
        type: "textarea",
        label: "Enter your AIDA sentence here (ending with a full stop)",
        placeholder: "Enter sentence",
        required: true,
      },
      {
        name: "topics",
        type: "text",
        label: "Topics",
        placeholder: "URI of concept or topic the sentence is about",
        required: false,
        multiple: true,
      },
      {
        name: "relatedTo",
        type: "text",
        label: "Relates to this nanopublication",
        placeholder: "URI of nanopublication for related reasearch project",
      },
      {
        name: "supportedBy",
        type: "text",
        label: "Relates to this nanopublication",
        placeholder: "URI of nanopublication for related dataset",
        required: false,
      },
    ],
    submitLabel: "Publish",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        aidaSentence: "",
        topics: [],
        relatedTo: "",
        supportedBy: "",
      },
      onSubmit: ({ value }) => {
        console.log("Data submitted:", value);
        toast.info("This is only a Demo!", {
          description: "Publishing features coming soon.",
        });
      },
    },
  });
  return <Form />;
}
