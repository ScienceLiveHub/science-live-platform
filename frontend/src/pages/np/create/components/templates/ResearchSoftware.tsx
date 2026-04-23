import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
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
    software: z.string().url(),
    title: z.string().min(3).max(200),
    repository: z.string().url(),
    project: z.string().url(),
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
        label: "URI of published software",
        placeholder: "https://doi.org/10... or https://github.com/...",
        required: true,
        description:
          "The URI where the software is published (e.g. a DOI, Zenodo record, or repository URL)",
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
        placeholder: "https://w3id.org/np/...",
        required: true,
        description:
          "URI of the nanopublication describing the research project that produced this software",
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
        // Map repeatable array fields to the template's statement IDs.
        // sub:st041 uses placeholder sub:dataset; sub:st05 uses sub:researchoutput.
        const payload: Record<string, string | object> = {
          ...value,
          st041: (value.datasets ?? [])
            .filter(Boolean)
            .map((d) => ({ dataset: d })),
          st05: (value.researchOutputs ?? [])
            .filter(Boolean)
            .map((r) => ({ researchoutput: r })),
        };
        await submit(payload);
      },
    },
  });

  return <Form />;
}
