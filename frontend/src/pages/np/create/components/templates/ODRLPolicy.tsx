import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import { NS } from "@/lib/rdf";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

const DPV_NS = "https://w3id.org/dpv#";

const POLICY_TYPES = [
  {
    value: NS.ODRL("Offer").value,
    label: "Offer (data available under conditions)",
  },
  { value: NS.ODRL("Set").value, label: "Set (general policy statement)" },
];

const PERMITTED_ACTIONS = [
  { value: NS.ODRL("use").value, label: "Use" },
  { value: NS.ODRL("reproduce").value, label: "Reproduce" },
  { value: NS.ODRL("derive").value, label: "Derive" },
  { value: NS.ODRL("modify").value, label: "Modify" },
  { value: NS.ODRL("distribute").value, label: "Distribute" },
  { value: NS.ODRL("present").value, label: "Present" },
];

const PURPOSES = [
  { value: DPV_NS + "AcademicResearch", label: "Academic Research" },
  { value: DPV_NS + "ScientificResearch", label: "Scientific Research" },
  {
    value: DPV_NS + "NonCommercialResearch",
    label: "Non-Commercial Research",
  },
  { value: DPV_NS + "PublicBenefit", label: "Public Benefit" },
];

const PROHIBITED_ACTIONS = [
  { value: NS.ODRL("commercialize").value, label: "Commercialize" },
  { value: NS.ODRL("sell").value, label: "Sell" },
  { value: NS.ODRL("distribute").value, label: "Distribute" },
  { value: NS.ODRL("modify").value, label: "Modify" },
];

const DUTY_ACTIONS = [
  { value: NS.ODRL("attribute").value, label: "Attribute" },
  { value: NS.ODRL("compensate").value, label: "Compensate" },
  { value: NS.ODRL("obtainConsent").value, label: "Obtain Consent" },
];

export default function ODRLPolicy({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  /**
   * The Schema for types, validation, and error messages
   */
  const schema = z.object({
    policyUri: z.string().min(1, "A value is required"),
    datasetUri: z.string().min(1, "A value is required"),
    policyType: z.string(),
    permGroup: z
      .object({
        permittedAction: z.enum(
          PERMITTED_ACTIONS.map((d) => d.value),
          "Select an option",
        ),
        purposeConstraint: z.enum(
          PURPOSES.map((d) => d.value),
          "Select an option",
        ),
      })
      .array()
      .min(1, "At least one permission should be specified"),
    prohibitions: z
      .enum(
        PROHIBITED_ACTIONS.map((d) => d.value),
        "Select an option",
      )
      .array()
      .optional(),
    dutyGroup: z
      .object({
        dutyAction: z.enum(
          DUTY_ACTIONS.map((d) => d.value),
          "Select an option",
        ),
        attributionParty: z.url().optional(),
      })
      .array()
      .optional(),
    // Placeholders for compatibility with template generateNanopublication()
    prohibGroup: z
      .object({
        prohibitedAction: z.enum(
          PROHIBITED_ACTIONS.map((d) => d.value),
          "Select an option",
        ),
      })
      .array()
      .optional(),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "policyUri",
        type: "prefixed",
        label: "Policy identifier",
        description: "Unique URI for this access policy.",
        placeholder: "my-policy",
        required: true,
        prefixedInputConfig: {
          prefix: "",
          prefixLabel: "https://fair2adapt.eu/policy/",
        },
      },
      {
        name: "datasetUri",
        type: "prefixed",
        label: "FAIR dataset",
        description: "The dataset to which access is granted.",
        placeholder: "my-dataset",
        required: true,
        prefixedInputConfig: {
          prefix: "",
          prefixLabel: "https://fair2adapt.eu/data/",
        },
      },
      {
        name: "policyType",
        type: "radio",
        label: "Policy type",
        required: true,
        options: POLICY_TYPES,
      },
      {
        name: "permGroup",
        type: "array",
        label: "Permissions",
        description:
          "Actions this policy permits, each with a required purposes.",
        required: true,
        defaultValue: [],
        arrayConfig: {
          defaultValue: {},
          minItems: 1,
          itemType: "object",
          objectConfig: {
            layout: "grid",
            fields: [
              {
                name: "permittedAction",
                type: "combobox",
                label: "Permitted to",
                options: PERMITTED_ACTIONS,
                comboboxConfig: {
                  searchable: false,
                  placeholder: "-",
                },
              },
              {
                name: "purposeConstraint",
                type: "combobox",
                label: "Only if the purpose is",
                options: PURPOSES,
                comboboxConfig: {
                  searchable: false,
                  placeholder: "-",
                },
              },
            ],
          },
        },
      },
      {
        name: "prohibitions",
        type: "multiSelect",
        label: "Prohibitions",
        description: "Actions this policy explicitly prohibits.",
        required: false,
        options: PROHIBITED_ACTIONS,
        multiSelectConfig: {
          creatable: false,
          searchable: false,
          maxSelections: PROHIBITED_ACTIONS.length,
        },
        wrapper: (field) => (
          <div className="max-w-md">
            <span className="m-0 block text-xs text-muted-foreground/50">
              optional
            </span>
            {field.children}
          </div>
        ),
      },
      {
        name: "dutyGroup",
        type: "array",
        label: "Duties",
        description:
          "Obligations the requester must fulfil when using the data.",
        gridColumnSpan: 2,
        required: false,
        defaultValue: [],
        arrayConfig: {
          defaultValue: {},
          itemType: "object",
          objectConfig: {
            layout: "grid",
            fields: [
              {
                name: "dutyAction",
                type: "combobox",
                options: DUTY_ACTIONS,
                comboboxConfig: {
                  searchable: false,
                  placeholder: "Select an option...",
                },
              },
              {
                name: "attributionParty",
                type: "text",
                placeholder: "URI of party to attribute (optional)",
                required: false,
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
    fieldClassName: "py-3",
    formOptions: {
      defaultValues: {
        policyUri: "",
        policyType: NS.ODRL("Offer").value,
        datasetUri: "",
        permGroup: [],
        prohibitions: [],
        dutyGroup: [],
        prohibGroup: [],
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        value.prohibGroup = value.prohibitions?.map((p) => ({
          prohibitedAction: p,
        }));

        await submit(value);
      },
    },
  });
  return <Form />;
}
