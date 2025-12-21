import { useFormedible } from "@/hooks/use-formedible";
import { fetchPossibleValuesFromQuads } from "@/lib/rdf";
import { useEffect, useState } from "react";
import z from "zod";
import { NanopubTemplateDefComponentProps, validLength } from "./registry";

export default function CommentOnPaper({
  publish,
}: NanopubTemplateDefComponentProps) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const fetchedOptions = await fetchPossibleValuesFromQuads(
          "http://purl.org/np/RAJb-zZdFrNzgwxmMzFstFeKTZAJImhMGNL-IzEJY4kx8",
        );

        // Transform the fetched data to match the expected format
        const transformedOptions = fetchedOptions.map((option) => ({
          value: option.name,
          label: option.description,
        }));

        setOptions(transformedOptions);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load comment types:", err);
        setError("Failed to load comment types. Please try again.");
        setLoading(false);
      }
    };

    loadOptions();
  }, []);

  /**
   * The Schema for types, validation, and error messages
   */
  const schema = z.object({
    paper: z.url(),
    relation: z.string(),
    text: z.string().regex(validLength(0, 500)),
  });

  /**
   * Construct the form component using Formedible
   * See manual builder: https://formedible.dev/builder or AI tool https://formedible.dev/ai-builder
   */
  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "paper",
        type: "text",
        label: "URL of the paper",
        placeholder: "Enter URL",
      },
      {
        name: "relation",
        type: "combobox",
        label: "How the comment relates to the paper",
        options: options,
        disabled: loading,
        comboboxConfig: {
          searchable: true,
          placeholder: loading ? "Loading..." : "Select relation...",
          searchPlaceholder: "Search relations...",
          noOptionsText: error || "No relations found.",
        },
      },
      {
        name: "text",
        type: "text",
        label: "Your text (max. 500 characters)",
        placeholder: "enter text",
      },
    ],
    submitLabel: "Publish",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        paper: "",
        relation: "",
        text: "",
      },
      onSubmit: async ({ value }) => {
        await publish(value);
      },
    },
  });
  return <Form />;
}
