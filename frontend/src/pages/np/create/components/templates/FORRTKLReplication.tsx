import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import ApiComboboxMultipleExpandable, {
  ApiComboboxSingle,
} from "@/components/np/api-combobox";
import {
  ResultItem,
  searchFORRTClaims,
  WIKIDATA_ENTITY_API,
} from "@/components/np/api-endpoints";
import { QueryComboboxField } from "@/components/np/query-combobox";
import { useFormedible } from "@/hooks/use-formedible";
import { useState } from "react";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

// --- Study type options ------------------------------------------------------

const STUDY_TYPE_OPTIONS = [
  {
    value: "https://w3id.org/sciencelive/o/terms/Reproduction-Study",
    label:
      "Reproduction Study - direct reproduction: same methodology, same tools",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/Replication-Study",
    label:
      "Replication Study - replication with different methodology or conditions",
  },
  {
    value:
      "https://w3id.org/sciencelive/o/terms/Reproduction-Replication-Study",
    label:
      "Reproduction/Replication Study - study that is both, reproduction and replication",
  },
];

// --- Form component ----------------------------------------------------------

export default function FORRTKLReplication({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const [claimSelection, setClaimSelection] = useState<ResultItem | null>(null);

  const schema = z.object({
    study: z
      .string()
      .min(1, "Study ID is required")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Only letters, numbers, hyphens, and underscores",
      ),
    label: z.string().min(1, "Label is required"),
    type: z.string().min(1, "Must select a study type"),
    claim: z.string().min(1, "Must select a FORRT claim"),
    scope: z.string().min(1, "Scope description is required"),
    methodology: z.string().min(1, "Methodology description is required"),
    deviation: z.string().optional(),
    keywordSelection: z
      .object({ uri: z.string(), label: z.string() })
      .array()
      .optional(),
    disciplineSelection: z
      .object({ uri: z.string(), label: z.string() })
      .optional(),
    st7: z.array(z.object({ keyword: z.string() })).optional(),
    discipline: z.string().optional(),
    // Knowledge Loom fields
    "kl-method": z.string().optional(),
    "kl-package": z.string().optional(),
    "kl-runtime": z.string().optional(),
    "kl-input-source": z
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("")),
    "kl-input-desc": z.string().optional(),
    "kl-script": z.url("Must be a valid URL").optional().or(z.literal("")),
    "kl-loom-record": z.url("Must be a valid URL").optional().or(z.literal("")),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "study",
        type: "text",
        label: "Short URI suffix for study ID",
        placeholder: "e.g. my-study-01",
        required: true,
      },
      {
        name: "label",
        type: "text",
        label: "Label/name of replication study",
        placeholder: "A descriptive name for this study",
        required: true,
      },
      {
        name: "type",
        type: "select",
        label: "Study type",
        required: true,
        options: STUDY_TYPE_OPTIONS,
      },
      {
        name: "claim",
        type: "text",
        label: "FORRT Claim",
        placeholder: "Search for a FORRT claim",
        required: true,
        component: ({ fieldApi }) => (
          <QueryComboboxField
            value={claimSelection}
            onValueChange={(item) => {
              setClaimSelection(item);
              fieldApi.setValue(item?.uri || "");
            }}
            searchFunction={searchFORRTClaims}
            labelText="Search for a FORRT claim"
            instructionText="Search FORRT claims..."
            placeholderText="Type to search FORRT claims..."
          />
        ),
      },
      {
        name: "scope",
        type: "textarea",
        label: "Describe what part of the claim is reproduced/replicated",
        placeholder: "Scope description...",
        required: true,
      },
      {
        name: "methodology",
        type: "textarea",
        label: "Describe how the claim is reproduced/replicated",
        placeholder: "Methodology description...",
        required: true,
      },
      {
        name: "deviation",
        type: "textarea",
        label: "Describe any deviations from original methodology (optional)",
        placeholder: "Deviation description...",
        required: false,
      },
      {
        name: "keywordSelection",
        type: "array",
        label: "Keywords (optional)",
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
            title="Search keywords (Wikidata)"
          />
        ),
      },
      {
        name: "disciplineSelection",
        type: "array",
        label: "Scientific discipline (optional)",
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
          <ApiComboboxSingle
            endpoints={[WIKIDATA_ENTITY_API]}
            value={fieldApi.state.value || null}
            onValueChange={(item) => {
              fieldApi.setValue(item);
            }}
            title="Search discipline (Wikidata)"
            placeholder="Type to search..."
          />
        ),
      },
      // --- Knowledge Loom metadata section ---
      {
        name: "kl-method",
        type: "text",
        label: "Software method / function (optional)",
        placeholder: "e.g. stats::aov(), lme4::glmer()",
        required: false,
        section: { title: "Computational Environment (Knowledge Loom)" },
      },
      {
        name: "kl-package",
        type: "text",
        label: "Software package and version (optional)",
        placeholder: "e.g. lme4 1.1-35.5, scipy 1.15.1",
        required: false,
      },
      {
        name: "kl-runtime",
        type: "text",
        label: "Runtime environment and version (optional)",
        placeholder: "e.g. R 4.4.1, Python 3.11.5",
        required: false,
      },
      {
        name: "kl-input-source",
        type: "text",
        label: "Input data source URL (optional)",
        placeholder: "https://...",
        required: false,
      },
      {
        name: "kl-input-desc",
        type: "text",
        label: "Input data description (optional)",
        placeholder:
          "e.g. 229 rows x 8 columns, mercury measurements in albatrosses",
        required: false,
      },
      {
        name: "kl-script",
        type: "text",
        label: "Analysis script URL (optional)",
        placeholder: "https://gitlab.com/... or https://github.com/...",
        required: false,
      },
      {
        name: "kl-loom-record",
        type: "text",
        label: "Knowledge Loom record URL (optional)",
        placeholder:
          "https://gitlab.com/TIBHannover/lki/knowledge-loom/loom-records/...",
        required: false,
      },
      ...NanopubEditorOptionFields,
    ],
    globalWrapper: ShowOptionalWrapper,
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        study: "",
        label: "",
        type: "https://w3id.org/sciencelive/o/terms/Reproduction-Study",
        claim: "",
        scope: "",
        methodology: "",
        deviation: "",
        keywordSelection: [],
        disciplineSelection: undefined,
        "kl-method": "",
        "kl-package": "",
        "kl-runtime": "",
        "kl-input-source": "",
        "kl-input-desc": "",
        "kl-script": "",
        "kl-loom-record": "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        const v = value as any;
        // Map keywordSelection to st7 (repeatable statement placeholder)
        v.st7 = v.keywordSelection?.map((k: { uri: string }) => ({
          keyword: k.uri,
        }));
        // Map disciplineSelection to discipline placeholder
        v.discipline = v.disciplineSelection?.uri || "";
        await submit(v);
      },
    },
  });

  return <Form />;
}
