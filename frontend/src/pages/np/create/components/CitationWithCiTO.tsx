import { useFormedible } from "@/hooks/use-formedible";
import { fetchPossibleValuesFromQuads } from "@/lib/rdf";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";

export default function CitationWithCiTO() {
  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const fetchedOptions = await fetchPossibleValuesFromQuads(
          "https://w3id.org/np/RAZt5kzfoJg2m4dMRdMm2SP6JeUDD_GMzSq9xyRPMgP5k",
        );

        // Transform the fetched data to match the expected format
        const transformedOptions = fetchedOptions.map((option) => ({
          value: option.name,
          label: option.description,
        }));

        setOptions(transformedOptions);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load citation types:", err);
        setError("Failed to load citation types. Please try again.");
        setLoading(false);
      }
    };

    loadOptions();
  }, []);

  /**
   * The Schema for types, validation, and error messages
   */
  const schema = z.object({
    citingDoi: z.string(),
    type: z.string(),
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
        placeholder: "https://doi.org/10... or other URL",
      },
      {
        name: "type",
        type: "combobox",
        label: "Citation Type",
        options: options,
        disabled: loading,
        comboboxConfig: {
          searchable: true,
          placeholder: loading ? "Loading..." : "Select citation type...",
          searchPlaceholder: "Search citation types...",
          noOptionsText: error || "No citation types found.",
        },
      },
      {
        name: "citedDoi",
        type: "text",
        label: "Cited DOI",
        placeholder: "https://doi.org/10... or other URL",
      },
    ],
    submitLabel: "Publish",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        citingDoi: "",
        type: "",
        citedDoi: "",
      },
      onSubmit: async ({ value }) => {
        console.log("Data submitted:", value);
        toast.info("This is only a Demo!", {
          description: "Publishing features coming soon.",
        });
      },
    },
  });
  return <Form />;
}
