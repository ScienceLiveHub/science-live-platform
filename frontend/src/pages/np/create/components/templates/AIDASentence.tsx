import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import ApiComboboxMultipleExpandable, {
  SearchEndpoint,
} from "@/components/np/api-combobox";
import { useFormedible } from "@/hooks/use-formedible";
import { isNanopubUri } from "@/lib/uri";
import { KyResponse } from "ky";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

const topicEndpoints: SearchEndpoint[] = [
  {
    name: "nanopubThing",
    label: "NanopubThing",
    url: "https://purl.org/nanopub/api/find_signed_things?type=http%3A%2F%2Fwww.w3.org%2F2002%2F07%2Fowl%23Class&searchterm=",
    parser: async (res: KyResponse) => {
      const text = await res.text();
      // Process SPARQL XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const results = xmlDoc.getElementsByTagName("result");
      return Array.from(results).map((result) => {
        const uri =
          result.querySelector("binding[name='thing'] uri")?.textContent || "";
        const label =
          result.querySelector("binding[name='label'] literal")?.textContent ||
          uri;
        return { uri, label };
      });
    },
  },
  {
    name: "wikidata",
    label: "Wikidata",
    url: "https://www.wikidata.org/w/api.php?action=wbsearchentities&language=en&format=json&origin=*&limit=5&search=",
    parser: async (res: KyResponse) => {
      const json = await res.json<{
        search: { concepturi: string; label: string; description: string }[];
      }>();
      // Process Wikidata JSON
      return (json.search || []).map((item) => ({
        uri: item.concepturi,
        label: item.label,
        description: item.description,
      }));
    },
  },
];

export default function AIDASentence({
  publish,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  /**
   * The Schema for types, validation, and error messages
   */
  const schema = z.object({
    aida: z.string().min(5).max(500).endsWith("."),
    topic: z
      .object({
        uri: z.string(),
        label: z.string(),
      })
      .array()
      .optional(),
    project: z
      .string()
      .refine(isNanopubUri, "Must be a valid Nanopublication URI"),
    dataset: z.url().optional(),
    publication: z.url().optional(),
    // This placeholder is needed because we translate from `topic` (compatible with
    // ApiComboboxMultipleExpandable) to `st1` (compatible with generateNanopublication())
    st1: z.array(z.object<{ topic: string }>()).optional(),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "aida",
        type: "textarea",
        label: "Enter your AIDA sentence here (ending with a full stop)",
        placeholder: "Enter sentence.",
        required: true,
      },
      {
        name: "topic",
        type: "array",
        label: "Topics",
        placeholder: "List topics the sentence is about",
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
            endpoints={topicEndpoints}
            value={fieldApi.state.value || []}
            onValueChange={(items) => {
              fieldApi.setValue(items);
            }}
            maxShownItems={5}
            title="Select related topics/tags"
          />
        ),
      },
      //TODO: `project` is actually a guided choice from API, but template-specified API doesn't work?
      {
        name: "project",
        type: "text",
        label: "Relates to this nanopublication",
        placeholder: "URI of nanopublication for related research project",
        required: true,
      },
      {
        name: "dataset",
        type: "text",
        label: "Supported by dataset",
        placeholder: "URI of related published dataset",
      },
      ...NanopubEditorOptionFields,
    ],
    globalWrapper: ShowOptionalWrapper,
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        aida: "",
        project: "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        // convert to make it work correctly with generateNanopublication()
        value.st1 = value.topic?.map((t: Record<string, string>) => ({
          topic: t.uri,
        }));
        await publish(value);
      },
    },
  });
  return <Form />;
}
