import { useFormedible } from "@/hooks/use-formedible";
import { fetchPossibleValuesFromQuads } from "@/lib/rdf";
import { useEffect, useState } from "react";
import z, { object } from "zod";
import { NanopubTemplateDefComponentProps } from "./component-registry";

export default function CitationWithCiTO({
  publish,
  prefilledData = {},
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
          "https://w3id.org/np/RAZt5kzfoJg2m4dMRdMm2SP6JeUDD_GMzSq9xyRPMgP5k",
        );

        const transformedOptions = fetchedOptions.map((option) => {
          const split = option.description.split("-");
          return {
            value: option.name,
            label: split[0],
            description: split[1],
          };
        });

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
    article: z.url(),
    st02: z.array(object({ cites: z.string(), cited: z.url() })),
  });

  /**
   * Construct the form component using Formedible
   * See manual builder: https://formedible.dev/builder or AI tool https://formedible.dev/ai-builder
   */
  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "article",
        type: "text",
        label: "Identifier for the citing paper or other scholarly work",
        placeholder: "https://doi.org/10... or other URL",
      },
      {
        type: "array",
        name: "st02",
        section: {
          title: "List citations",
        },
        gridColumnSpan: 3,
        defaultValue: [],
        arrayConfig: {
          defaultValue: {},
          minItems: 1,
          itemType: "object",
          objectConfig: {
            fields: [
              {
                name: "cites",
                type: "combobox",
                label: "Citation Type",
                options: options,
                disabled: loading,
                comboboxConfig: {
                  searchable: true,
                  placeholder: loading
                    ? "Loading..."
                    : "Select citation type...",
                  searchPlaceholder: "Search citation types...",
                  noOptionsText: error || "No citation types found.",
                },
              },
              {
                name: "cited",
                type: "url",
                label:
                  "DOI (https://doi.org/10...) or other URL of the cited article",
                placeholder: "https://... or other URL",
                required: false,
                section: {
                  title: "Statement st02",
                },
              },
            ],
          },
        },
      },
    ],
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        article: "",
        cites: "",
        cited: "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        value.st02 = (value.st02 as Array<any>).map((v) => ({
          ...v,
          article: value.article,
        }));
        await publish(value);
      },
    },
  });
  return <Form />;
}
