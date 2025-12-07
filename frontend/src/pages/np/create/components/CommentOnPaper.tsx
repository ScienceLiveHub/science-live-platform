import { useFormedible } from "@/hooks/use-formedible";
import { toast } from "sonner";
import z from "zod";

export default function CommentOnPaper() {
  /**
   * The Schema for types, validation, and error messages
   */
  const schema = z.object({
    citingDoi: z.string(),
    type: z.enum(["agrees", "support", "sales"]),
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
        name: "citingURL",
        type: "text",
        label: "URL of the paper",
        placeholder: "Enter URL",
      },
      {
        name: "type",
        type: "combobox",
        label: "How the comment relates to the paper",
        options: [
          {
            value: "agrees",
            label:
              "Agrees with - agrees with statements, ideas or conclusions presented in the cited entity",
          },
          {
            value: "support",
            label:
              "Cites as authority - cites as something that provides an authoritative description or definiton of the subject under discussion",
          },
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
        type: "agrees" as const,
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
