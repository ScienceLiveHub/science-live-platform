import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import ApiComboboxMultipleExpandable from "@/components/np/api-combobox";
import { WIKIDATA_ENTITY_API } from "@/components/np/api-endpoints";
import { useFormedible } from "@/hooks/use-formedible";
import { fetchPossibleValuesFromQuads } from "@/lib/rdf";
import { useEffect, useState } from "react";
import z, { object } from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

// --- Language options (loaded from nanopub) ---------------------------------

const LANGUAGE_NANOPUB_URI =
  "https://w3id.org/np/RAK7AaDLgm5kPaqsPp7Mh6yrnrC2Tr0RsGQVAKYrK07ps";

function useLanguageOptions() {
  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    [],
  );

  useEffect(() => {
    fetchPossibleValuesFromQuads(LANGUAGE_NANOPUB_URI)
      .then((items) =>
        setOptions(
          items
            .map((item) => ({
              value: item.name,
              label: item.description || item.name,
            }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        ),
      )
      .catch((err) => console.error("Failed to load language options:", err));
  }, []);

  return options;
}

// --- Form component --------------------------------------------------------

export default function PRISMASearchStrategy({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const languageOptions = useLanguageOptions();

  const schema = z.object({
    label: z.string().min(1, "Label is required"),
    systematicReview: z.url("Must be a valid URL"),
    searchTermSelection: z
      .object({ uri: z.string(), label: z.string() })
      .array()
      .optional(),
    st03: z
      .array(
        object({
          databases: z.url(),
        }),
      )
      .optional(),
    "start-date": z.coerce.date(),
    "end-date": z.coerce.date(),
    language: z.array(z.string()).optional(),
    "methodology-notes": z.string().min(1, "Methodology notes are required"),
    st02: z.array(z.object({ "search-terms": z.string() })).optional(),
    st05: z
      .array(
        object({
          language: z.string(),
        }),
      )
      .optional(),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "label",
        type: "text",
        label: "Label for the search strategy",
        placeholder: "e.g. My systematic review search - PubMed",
        required: true,
      },
      {
        name: "systematicReview",
        type: "text",
        label: "URI of the systematic review this strategy is part of",
        placeholder: "https://doi.org/...",
        required: true,
      },
      {
        name: "searchTermSelection",
        type: "array",
        label: "Search terms (concepts)",
        required: false,
        arrayConfig: {
          minItems: 0,
          itemType: "object",
          objectConfig: {
            fields: [
              { name: "uri", type: "text" },
              { name: "label", type: "text" },
              { name: "description", type: "text", placeholder: "" },
            ],
          },
        },
        component: ({ fieldApi }) => (
          <ApiComboboxMultipleExpandable
            endpoints={[WIKIDATA_ENTITY_API]}
            value={fieldApi.state.value || []}
            onValueChange={(items) => {
              fieldApi.setValue(items);
            }}
            maxShownItems={5}
            title="Search terms (Wikidata concepts)"
          />
        ),
      },
      {
        name: "st03",
        type: "array",
        label: "Databases searched",
        arrayConfig: {
          minItems: 0,
          itemType: "object",
          objectConfig: {
            fields: [
              {
                name: "databases",
                type: "text",
                placeholder:
                  "Database URI (e.g. https://pubmed.ncbi.nlm.nih.gov/)",
              },
            ],
          },
        },
      },
      {
        name: "start-date",
        type: "date",
        label: "Start date for literature search",
        required: true,
      },
      {
        name: "end-date",
        type: "date",
        label: "End date for literature search",
        required: true,
      },
      {
        name: "language",
        type: "multicombobox",
        label: "Languages covered",
        options: languageOptions,
        arrayConfig: {
          minItems: 0,
          itemType: "text",
        },
      },
      {
        name: "methodology-notes",
        type: "textarea",
        label: "Methodology notes",
        placeholder:
          "Describe the search methodology, inclusion/exclusion criteria, etc.",
        required: true,
      },
      ...NanopubEditorOptionFields,
    ],
    globalWrapper: ShowOptionalWrapper,
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        label: "",
        systematicReview: "",
        searchTermSelection: [],
        language: [],
        "start-date": undefined as unknown as Date,
        "end-date": undefined as unknown as Date,
        st03: [],
        "methodology-notes": "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        const v = value as any;

        // Map special multi-selection fields to template repeatable statements format
        v.st02 = v.searchTermSelection?.map((t: { uri: string }) => ({
          "search-terms": t.uri,
        }));
        v.st05 = v.language?.map((l: string) => ({
          language: l,
        }));

        // Convert dates to ISO date strings
        if (v["start-date"] instanceof Date) {
          v["start-date"] = v["start-date"].toISOString().split("T")[0];
        }
        if (v["end-date"] instanceof Date) {
          v["end-date"] = v["end-date"].toISOString().split("T")[0];
        }

        await submit(v);
      },
    },
  });

  return <Form />;
}
