import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

export default function PRISMASearchExecutionDataset({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const schema = z.object({
    label: z.string().min(1, "Label is required"),
    systematicReview: z.string().url("Must be a valid URI"),
    creationDate: z.coerce.date(),
    st06: z
      .array(z.object({ dbSearch: z.string().min(1) }))
      .optional(),
    deduplicationMethodology: z.string().min(1, "Required"),
    reviewMethodology: z.string().optional().or(z.literal("")),
    screeningMethod: z.string().min(1, "Required"),
    screenedRecordCount: z.string().min(1, "Required"),
    fulltextScreenedRecordCount: z.string().min(1, "Required"),
    finalIncludedStudyCount: z.string().min(1, "Required"),
    exclusionBreakdown: z.string().min(1, "Required"),
    limitations: z.string().optional().or(z.literal("")),
    datasetFileLocation: z.string().url("Must be a valid URL"),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "label",
        type: "text",
        label: "Label of this search execution dataset",
        placeholder: "e.g., Climate migration systematic review - search execution",
        required: true,
      },
      {
        name: "systematicReview",
        type: "text",
        label: "Systematic Review URI",
        placeholder: "https://...",
        required: true,
        description: "URI of the systematic review this dataset belongs to",
      },
      {
        name: "creationDate",
        type: "date",
        label: "Date of search execution completion",
        required: true,
      },
      {
        name: "st06",
        type: "array",
        label: "Database Searches included",
        arrayConfig: {
          minItems: 0,
          itemType: "object",
          objectConfig: {
            fields: [
              {
                name: "dbSearch",
                type: "text",
                placeholder: "URI of a database search nanopublication",
              },
            ],
          },
        },
        section: {
          title: "Included Searches",
        },
      },
      {
        name: "deduplicationMethodology",
        type: "textarea",
        label: "Deduplication Methodology",
        placeholder:
          "e.g., EndNote 20: automatic + manual verification",
        required: true,
        description: "Deduplication software and methodology",
        section: {
          title: "Methodology",
        },
      },
      {
        name: "reviewMethodology",
        type: "textarea",
        label: "Review Methodology",
        placeholder:
          "Number of reviewers, independence status, disagreement resolution methods...",
        required: false,
        section: {
          title: "Methodology",
        },
      },
      {
        name: "screeningMethod",
        type: "textarea",
        label: "Screening Methodology",
        placeholder:
          "Title/abstract and full-text screening methodology...",
        required: true,
        section: {
          title: "Methodology",
        },
      },
      {
        name: "screenedRecordCount",
        type: "text",
        label: "Total records screened",
        placeholder: "e.g., 3500",
        required: true,
        section: {
          title: "Screening Counts",
        },
      },
      {
        name: "fulltextScreenedRecordCount",
        type: "text",
        label: "Records proceeding to full-text screening",
        placeholder: "e.g., 250",
        required: true,
        section: {
          title: "Screening Counts",
        },
      },
      {
        name: "finalIncludedStudyCount",
        type: "text",
        label: "Final number of studies included",
        placeholder: "e.g., 42",
        required: true,
        section: {
          title: "Screening Counts",
        },
      },
      {
        name: "exclusionBreakdown",
        type: "textarea",
        label: "Exclusion Breakdown",
        placeholder:
          "Summary of exclusion reasons with study counts by category...",
        required: true,
        section: {
          title: "Results",
        },
      },
      {
        name: "limitations",
        type: "textarea",
        label: "Limitations",
        placeholder:
          "Search limitations, protocol modifications, and additional methodological notes...",
        required: false,
        section: {
          title: "Results",
        },
      },
      {
        name: "datasetFileLocation",
        type: "text",
        label: "Dataset File Location",
        placeholder: "https://zenodo.org/record/...",
        required: true,
        description:
          "URL where complete search results are deposited (Zenodo, Figshare, etc.)",
        section: {
          title: "Data Deposit",
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
        label: "",
        systematicReview: "",
        creationDate: undefined as unknown as Date,
        st06: [],
        deduplicationMethodology: "",
        reviewMethodology: "",
        screeningMethod: "",
        screenedRecordCount: "",
        fulltextScreenedRecordCount: "",
        finalIncludedStudyCount: "",
        exclusionBreakdown: "",
        limitations: "",
        datasetFileLocation: "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        const v = value as any;
        if (v.creationDate instanceof Date) {
          v.creationDate = v.creationDate.toISOString().split("T")[0];
        }
        if (!v.st06 || v.st06.length === 0) delete v.st06;
        await submit(v);
      },
    },
  });

  return <Form />;
}
