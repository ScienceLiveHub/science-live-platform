import { useFormedible } from "@/hooks/use-formedible";
import { toast } from "sonner";
import z from "zod";

export default function CitationWithCiTO() {
  /**
   * The Schema for types, validation, and error messages
   */
  const schema = z.object({
    citingDoi: z.string(),
    type: z.enum(["general", "support", "sales"]),
    citedDoi: z.string(),
  });

  /**
   * Construct the form component using Formedible
   * See manual builder: https://formedible.dev/builder or AI tool https://formedible.dev/ai-builder
   */
  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "citingDoi",
        type: "text",
        label: "Citing DOI",
        placeholder: "DOI",
      },
      {
        name: "type",
        type: "combobox",
        label: "Citation Type",
        options: [
          { value: "general", label: "General Inquiry" },
          { value: "support", label: "Technical Support" },
          { value: "sales", label: "Sales Question" },
        ],
        comboboxConfig: {
          searchable: true,
          placeholder: "Select subject...",
          searchPlaceholder: "Search subjects...",
          noOptionsText: "No subjects found.",
        },
      },
      {
        name: "citedDoi",
        type: "text",
        label: "Cited DOI",
        placeholder: "DOI",
      },
    ],
    submitLabel: "Publish",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        citingDoi: "",
        type: "general" as const,
        citedDoi: "",
      },
      onSubmit: async ({ value }) => {
        console.log("Form submitted:", value);
        toast.success("Message sent successfully!", {
          description: "We'll get back to you soon.",
        });
      },
    },
  });
  return <Form />;
}
