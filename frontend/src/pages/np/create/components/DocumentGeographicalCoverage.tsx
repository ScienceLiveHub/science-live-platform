import { useFormedible } from "@/hooks/use-formedible";
import { toast } from "sonner";
import z from "zod";

export default function DocumentGeographicalCoverage() {
  /**
   * The Schema for types, validation, and error messages
   */
  const schema = z.object({
    citedDoi: z.string(),
    quoteType: z.enum(["whole", "ends"]),
    quotedText: z.string().max(500),
    quotedTextEnd: z.string().max(500).optional(),
    shortId: z.string(),
    label: z.string(),
    geometryId: z.string(),
    geometry: z.string(),
    comment: z.string().max(800),
  });

  /**
   * Construct the form component using Formedible
   * See manual builder: https://formedible.dev/builder or AI tool https://formedible.dev/ai-builder
   */
  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "citedDoi",
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
        name: "quotedText",
        type: "textarea",
        label: "Quoted Text",
        placeholder: "The exact quotation from the paper",
        required: true,
        textareaConfig: {},
      },
      {
        name: "quotedTextEnd",
        type: "textarea",
        label: "Quoted Text End",
        description: "Use when quoting beginning and end of a longer passage",
        placeholder: "The exact quotation from the paper",
        textareaConfig: {},
        conditional: (values: any) => values.quoteType === "ends",
      },
      {
        name: "shortId",
        type: "text",
        label: "Short ID for location",
        description:
          "An ID for the geographical location to be used as teh URI suffix",
        placeholder: "",
        required: true,
      },
      {
        name: "label",
        type: "text",
        label: "Area name",
        description: "Name of the area covered",
        placeholder: "e.g. 'Northern Europe', 'Amazon Basin'",
        required: true,
      },
      {
        name: "geometryId",
        type: "text",
        label: "Short ID for geometry",
        placeholder: "",
        required: true,
      },
      {
        name: "geometry",
        type: "text",
        label: "Geometry as Well-knwon Text (WKT)",
        placeholder: "e.g. POINT(2.3 48.9) or POLYGON((...)) etc",
        required: true,
      },
      {
        name: "comment",
        type: "textarea",
        label: "Comment",
        description:
          "Our interpretation or explanation of why this quotation is relevant",
        placeholder: "Comment, interpretation or explanation",
        textareaConfig: {},
      },
    ],
    submitLabel: "Publish",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        citedDoi: "",
        quoteType: "whole",
        quotedText: "",
        shortId: "",
        label: "",
        geometry: "",
        geometryId: "",
        comment: "",
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
