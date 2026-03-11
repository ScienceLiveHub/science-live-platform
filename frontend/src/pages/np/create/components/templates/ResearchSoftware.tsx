import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import { validUriPlaceholder } from "@/lib/validation";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

export default function ResearchSoftware({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const schema = z.object({
    software: validUriPlaceholder,
    title: z.string().min(3).max(200),
    repository: z.string().url(),
    project: z.string().url().optional().or(z.literal("")),
    datasets: z.array(z.string().url()).optional(),
    researchOutputs: z.array(z.string().url()).optional(),
    license: z.string().url().optional().or(z.literal("")),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "software",
        type: "text",
        label: "Short ID (used as URI suffix)",
        placeholder: "e.g., my-software-v1",
        required: true,
        description:
          "A short identifier for this software (letters, numbers, hyphens)",
      },
      {
        name: "title",
        type: "text",
        label: "Software Title",
        placeholder: "e.g., QOMIC (Quantum Optimization for Motif Identification)",
        required: true,
        description: "The full name or title of the software",
      },
      {
        name: "repository",
        type: "text",
        label: "Repository URL",
        placeholder: "https://github.com/username/repository",
        required: true,
        description: "URL where the software source code is hosted",
        section: {
          title: "Software Details",
        },
      },
      {
        name: "project",
        type: "text",
        label: "Research Project",
        placeholder: "https://w3id.org/np/... or leave empty",
        required: false,
        description:
          "URI of the nanopublication describing the research project that produced this software (optional)",
        section: {
          title: "Software Details",
        },
      },
      {
        name: "license",
        type: "text",
        label: "License",
        placeholder: "https://spdx.org/licenses/MIT.html or other license URL",
        required: false,
        description: "URL of the software license (optional)",
        section: {
          title: "Software Details",
        },
      },
      {
        type: "array",
        name: "datasets",
        label: "Related Datasets",
        required: false,
        defaultValue: [],
        section: {
          title: "Related Resources",
        },
        arrayConfig: {
          defaultValue: "",
          minItems: 0,
          maxItems: 10,
          itemType: "text",
          addButtonLabel: "Add Dataset",
          itemLabel: "Dataset URL",
          itemPlaceholder: "https://doi.org/10... or other URL",
        },
      },
      {
        type: "array",
        name: "researchOutputs",
        label: "Related Publications",
        required: false,
        defaultValue: [],
        section: {
          title: "Related Resources",
        },
        arrayConfig: {
          defaultValue: "",
          minItems: 0,
          maxItems: 10,
          itemType: "text",
          addButtonLabel: "Add Publication",
          itemLabel: "Publication URL",
          itemPlaceholder: "https://doi.org/10... or other URL",
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
        software: "",
        title: "",
        repository: "",
        project: "",
        license: "",
        datasets: [],
        researchOutputs: [],
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        await submit(value);
      },
    },
  });

  return <Form />;
}
