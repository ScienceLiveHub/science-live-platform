import ApiComboboxMultipleExpandable, {
  SearchEndpoint,
} from "@/components/np/api-combobox";
import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import { fetchPossibleValuesFromQuads } from "@/lib/rdf";
import { KyResponse } from "ky";
import { useEffect, useState } from "react";
import z, { object } from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

// --- Wikidata search (for search terms) ------------------------------------

const wikidataEndpoint: SearchEndpoint[] = [
  {
    name: "wikidata",
    label: "Wikidata",
    url: "https://www.wikidata.org/w/api.php?action=wbsearchentities&language=en&format=json&origin=*&limit=5&search=",
    parser: async (res: KyResponse) => {
      const json = await res.json<{
        search: { concepturi: string; label: string; description: string }[];
      }>();
      return (json.search || []).map((item) => ({
        uri: item.concepturi,
        label: item.label,
        description: item.description,
      }));
    },
  },
];

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
    systematicReview: z.string().url("Must be a valid URL"),
    searchTermSelection: z
      .object({ uri: z.string(), label: z.string() })
      .array()
      .optional(),
    st2: z.array(z.object({ "search-terms": z.string() })).optional(),
    st3: z
      .array(
        object({
          databases: z.string().url("Must be a valid URI"),
        }),
      )
      .optional(),
    "start-date": z.coerce.date(),
    "end-date": z.coerce.date(),
    st5: z
      .array(
        object({
          language: z.string(),
        }),
      )
      .optional(),
    "methodology-notes": z.string().min(1, "Methodology notes are required"),
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
            endpoints={wikidataEndpoint}
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
        name: "st3",
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
                placeholder: "Database URI (e.g. https://pubmed.ncbi.nlm.nih.gov/)",
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
        name: "st5",
        type: "array",
        label: "Languages covered",
        arrayConfig: {
          minItems: 0,
          itemType: "object",
          objectConfig: {
            fields: [
              {
                name: "language",
                type: "select",
                label: "Language",
                options: languageOptions,
              },
            ],
          },
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
        st3: [],
        "start-date": undefined as unknown as Date,
        "end-date": undefined as unknown as Date,
        st5: [],
        "methodology-notes": "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        const v = value as any;

        // Map searchTermSelection to st2 (repeatable statement)
        v.st2 = v.searchTermSelection?.map((t: { uri: string }) => ({
          "search-terms": t.uri,
        }));
        delete v.searchTermSelection;

        // Convert dates to ISO date strings
        if (v["start-date"] instanceof Date) {
          v["start-date"] = v["start-date"].toISOString().split("T")[0];
        }
        if (v["end-date"] instanceof Date) {
          v["end-date"] = v["end-date"].toISOString().split("T")[0];
        }

        // Clean up empty arrays
        if (!v.st2 || v.st2.length === 0) delete v.st2;
        if (!v.st3 || v.st3.length === 0) delete v.st3;
        if (!v.st5 || v.st5.length === 0) delete v.st5;

        await submit(v);
      },
    },
  });

  return <Form />;
}
