import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import { NS } from "@/lib/rdf";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";
import { TEMPLATE_URI } from "./registry-metadata";

export default function ODRLAccessGrant({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  /**
   * The Schema for types, validation, and error messages
   */
  const schema = z.object({
    grantUri: z.url(),
    permissions: z
      .string()
      .array()
      .min(1, "At least one permission should be specified"),
    assigneeDid: z.url(),
    policyNanopubUri: z.string().min(1, "Must be a valid nanopub hash"),
    datasetUri: z.string().min(1, "A value is required"),
    grantTimestamp: z.coerce.date(),
    // Placeholders for compatibility with template generateNanopublication()
    permGroup: z.array(z.object<{ grantedAction: string }>()).optional(),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "grantUri",
        type: "text",
        label: "Grant identifier",
        description: "Unique URI for this access grant.",
        placeholder: "https://fair2adapt.eu/grant/...",
        required: true,
      },
      {
        name: "assigneeDid",
        type: "text",
        label: "Granted to",
        description:
          "Identify the requester of this Access Grant using a Distributed Identifier (DID).",
        placeholder:
          "DID URI of the requester (e.g. https://fair2adapt.github.io/fair-data-access/did.json)",
        required: true,
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
        name: "permissions",
        type: "multiSelect",
        label: "Permissions",
        description: "One or more actions the requester is allowed to perform.",
        required: true,
        options: [
          { value: NS.ODRL("use").value, label: "Use" },
          { value: NS.ODRL("reproduce").value, label: "Reproduce" },
          { value: NS.ODRL("distribute").value, label: "Distribute" },
        ],
        multiSelectConfig: {
          creatable: false,
          searchable: false,
          maxSelections: 3,
        },
        wrapper: (field) => <div className="max-w-sm">{field.children}</div>,
      },
      {
        name: "policyNanopubUri",
        type: "prefixed",
        placeholder: "RAaBc123_Xyz...",
        required: true,
        prefixedInputConfig: {
          prefix: "",
          prefixLabel: "https://w3id.org/np/",
        },
        wrapper: (field) => (
          <div>
            <div className="text-sm font-medium pb-1.5">ODRL Access Policy</div>
            <div className="text-xs text-muted-foreground pb-1.5">
              Nanopub URI of the ODRL policy this grant is under.{" "}
              <a
                href={`create?template=${TEMPLATE_URI.ODRL_POLICY}`}
                className="text-accent"
                target="_blank"
              >
                Create one
              </a>{" "}
              if required, then paste the ID here.
            </div>
            {field.children}
          </div>
        ),
      },
      {
        name: "grantTimestamp",
        type: "date",
        label: "Granted at",
        description: "The time that this grant was made.",
        required: true,
        dateConfig: {
          showTime: true,
          showTimezone: true,
        },
        wrapper: (field) => <div className="max-w-2xs">{field.children}</div>,
      },

      ...NanopubEditorOptionFields,
    ],
    globalWrapper: ShowOptionalWrapper,
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        grantUri: "",
        permissions: [],
        assigneeDid: "",
        policyNanopubUri: "",
        datasetUri: "",
        grantTimestamp: new Date(),
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        value.permGroup = value.permissions?.map((p) => ({
          grantedAction: p,
        }));

        await submit(value);
      },
    },
  });
  return <Form />;
}
