import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";
import { STUDY_TYPE_OPTIONS } from "./study-type-options";

/**
 * Replication request form (template `RAo1X8qf…`).
 *
 * A request points to a Quote-with-comment nanopub: the quotation states the
 * claim, the comment says why it matters. The request adds what should be done
 * (reproduction / replication / both) and optional suggestions: datasets and
 * software (as links) and notes on the approach. The requester is the signer.
 *
 * Template placeholders: `quote`, `studyType`, `approach`, and the repeatable
 * statements `st05` (`dataset`) and `st06` (`software`). The subject `request` is a
 * plain nt:LocalResource, minted by the engine as <new nanopub>/request.
 */
export default function ReplicationRequest({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const schema = z.object({
    quote: z
      .string()
      .regex(
        /^https:\/\/w3id\.org\/(sciencelive\/)?np\/RA[A-Za-z0-9_-]{43}$/,
        "Must be the URI of a Quote-with-comment nanopublication (https://w3id.org/np/RA…)",
      ),
    studyType: z.string().optional(),
    datasets: z.array(z.url()).optional(),
    software: z.array(z.url()).optional(),
    approach: z.string().max(800).optional(),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "quote",
        type: "text",
        label: "Claim to check (Quote-with-comment nanopublication)",
        placeholder: "https://w3id.org/np/RA…",
        required: true,
        description:
          "The quotation states the claim; its comment says why it matters.",
      },
      {
        name: "studyType",
        type: "select",
        label: "What should be done?",
        description:
          "Leave empty if either a reproduction or a replication is fine.",
        options: STUDY_TYPE_OPTIONS,
      },
      {
        type: "array",
        name: "datasets",
        label: "Suggested datasets",
        required: false,
        defaultValue: [],
        section: { title: "Suggestions (optional)" },
        arrayConfig: {
          defaultValue: "",
          minItems: 0,
          maxItems: 10,
          itemType: "text",
          addButtonLabel: "Add dataset",
          itemLabel: "Dataset link",
          itemPlaceholder: "https://doi.org/10… or another URL",
        },
      },
      {
        type: "array",
        name: "software",
        label: "Suggested software",
        description:
          "Best: a version DOI or Software Heritage ID. Otherwise the CRAN/PyPI/conda-forge/bio.tools page, the repository, or the Wikidata entry.",
        required: false,
        defaultValue: [],
        section: { title: "Suggestions (optional)" },
        arrayConfig: {
          defaultValue: "",
          minItems: 0,
          maxItems: 10,
          itemType: "text",
          addButtonLabel: "Add software",
          itemLabel: "Software link",
          itemPlaceholder:
            "https://doi.org/10.5281/zenodo… or https://cran.r-project.org/package=…",
        },
      },
      {
        name: "approach",
        type: "textarea",
        label: "Notes on the suggested approach",
        placeholder:
          "e.g. use an independent land-cover product instead of the original dataset",
        section: { title: "Suggestions (optional)" },
        textareaConfig: { maxLength: 800, showWordCount: true },
      },
      ...NanopubEditorOptionFields,
    ],
    globalWrapper: ShowOptionalWrapper,
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        quote: "",
        studyType: "",
        datasets: [],
        software: [],
        approach: "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        // Map to the template's placeholders and repeatable statement IDs.
        const payload: Record<string, string | object> = {
          ...value,
          st05: (value.datasets ?? [])
            .filter(Boolean)
            .map((d) => ({ dataset: d })),
          st06: (value.software ?? [])
            .filter(Boolean)
            .map((s) => ({ software: s })),
        };
        await submit(payload);
      },
    },
  });

  return <Form />;
}
