import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import { fetchPossibleValuesFromQuads } from "@/lib/rdf";
import { useEffect, useState } from "react";
import z, { object } from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

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
    st02: z
      .array(
        object({
          cites: z.string("Select a type").nonempty(),
          cited: z.url("Invalid URL"),
        }),
      )
      .nonempty("Add at least one citation"),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "article",
        type: "text",
        label: "Identifier for the citing paper or other scholarly work",
        placeholder: "https://doi.org/10... or other URL",
        required: true,
      },
      {
        type: "array",
        name: "st02",
        section: {
          title: "List citations",
        },
        gridColumnSpan: 3,
        required: true,
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
      ...NanopubEditorOptionFields,
    ],
    globalWrapper: ShowOptionalWrapper,
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        article: "",
        st02: [],
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        await publish(value);
      },
    },
  });
  return <Form />;
}
