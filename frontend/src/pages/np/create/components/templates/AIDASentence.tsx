import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import ApiComboboxMultipleExpandable from "@/components/np/api-combobox";
import {
  NANOPUB_THING_API,
  WIKIDATA_ENTITY_API,
} from "@/components/np/api-endpoints";
import { useFormedible } from "@/hooks/use-formedible";
import { isNanopubUri } from "@/lib/uri";
import z, { object } from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

export default function AIDASentence({
  submit,
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
    st3: z
      .array(
        object({
          dataset: z.url(),
        }),
      )
      .optional(),
    st4: z
      .array(
        object({
          publication: z.url(),
        }),
      )
      .optional(),
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
            endpoints={[NANOPUB_THING_API, WIKIDATA_ENTITY_API]}
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
        name: "st3",
        type: "array",
        label: "Supported by datasets",
        arrayConfig: {
          minItems: 0,
          itemType: "object",
          objectConfig: {
            fields: [
              {
                name: "dataset",
                type: "text",
                placeholder: "Enter dataset URI",
              },
            ],
          },
        },
      },
      {
        name: "st4",
        type: "array",
        label: "Supported by other publications",
        arrayConfig: {
          minItems: 0,
          itemType: "object",
          objectConfig: {
            fields: [
              {
                name: "publication",
                type: "text",
                placeholder: "Enter publication URI",
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
        aida: "",
        project: "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        // convert to make it work correctly with generateNanopublication()
        value.st1 = value.topic?.map((t: Record<string, string>) => ({
          topic: t.uri,
        }));
        await submit(value);
      },
    },
  });
  return <Form />;
}
