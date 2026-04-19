import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import ApiComboboxMultipleExpandable from "@/components/np/api-combobox";
import { SearchEndpoint } from "@/components/np/api-endpoints";
import { useFormedible } from "@/hooks/use-formedible";
import { KyResponse } from "ky";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

// --- Wikidata search endpoint -----------------------------------------------

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

// --- Form component ---------------------------------------------------------

export default function ResearchSynthesis({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const schema = z.object({
    synthesis: z
      .string()
      .min(1, "Synthesis ID is required")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Only letters, numbers, hyphens, and underscores",
      ),
    label: z.string().min(1, "Label is required"),
    conclusion: z.string().min(1, "Conclusion is required"),
    recommendation: z.string().min(1, "Recommendation is required"),
    conditions: z.string().min(1, "Conditions are required"),
    limitations: z.string().min(1, "Limitations are required"),
    date: z.coerce.date(),
    sources: z
      .array(z.object({ source: z.url("Must be a valid URL") }))
      .min(1, "Add at least one supporting source"),
    topicSelection: z
      .object({ uri: z.string(), label: z.string() })
      .array()
      .min(1, "Add at least one topic"),
    st7: z.array(z.object({ source: z.string() })).optional(),
    st10: z.array(z.object({ topic: z.string() })).optional(),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "synthesis",
        type: "text",
        label: "Short URI suffix for synthesis ID",
        placeholder: "e.g. few-shot-eurosat-synthesis",
        required: true,
      },
      {
        name: "label",
        type: "text",
        label: "Label of the synthesis",
        placeholder: "A one-line summary of the synthesis",
        required: true,
      },
      {
        name: "conclusion",
        type: "textarea",
        label: "Conclusion of the synthesis",
        placeholder: "Summarise the overall findings...",
        required: true,
      },
      {
        name: "recommendation",
        type: "textarea",
        label: "Recommendations",
        placeholder: "What should practitioners do based on this synthesis?",
        required: true,
      },
      {
        name: "conditions",
        type: "textarea",
        label: "Conditions under which the synthesis applies",
        placeholder: "Scope: data types, methods, domains...",
        required: true,
      },
      {
        name: "limitations",
        type: "textarea",
        label: "Limitations of the synthesis",
        placeholder: "What was not tested? What might not generalise?",
        required: true,
      },
      {
        name: "date",
        type: "date",
        label: "Completion date",
        required: true,
      },
      {
        name: "sources",
        type: "array",
        label: "Supporting sources (nanopub or other URIs)",
        required: true,
        arrayConfig: {
          minItems: 1,
          itemType: "object",
          objectConfig: {
            fields: [
              {
                name: "source",
                type: "text",
                label: "Source URL",
                placeholder: "https://w3id.org/np/... or other URL",
              },
            ],
          },
        },
      },
      {
        name: "topicSelection",
        type: "array",
        label: "Topics (Wikidata)",
        required: true,
        arrayConfig: {
          minItems: 1,
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
            title="Search topics (Wikidata)"
          />
        ),
      },
      ...NanopubEditorOptionFields,
    ],
    globalWrapper: ShowOptionalWrapper,
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        synthesis: "",
        label: "",
        conclusion: "",
        recommendation: "",
        conditions: "",
        limitations: "",
        date: undefined as unknown as Date,
        sources: [{ source: "" }],
        topicSelection: [],
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        const v = { ...value } as Record<string, unknown>;
        if (v.date instanceof Date) {
          v.date = (v.date as Date).toISOString().split("T")[0];
        }
        // Map the user-facing array fields onto the repeatable statement
        // placeholder names the template engine expects.
        v.st7 = (v.sources as { source: string }[] | undefined)?.map((s) => ({
          source: s.source,
        }));
        v.st10 = (
          v.topicSelection as { uri: string; label: string }[] | undefined
        )?.map((t) => ({ topic: t.uri }));
        delete v.sources;
        delete v.topicSelection;
        await submit(v as Record<string, string | object>);
      },
    },
  });

  return <Form />;
}
