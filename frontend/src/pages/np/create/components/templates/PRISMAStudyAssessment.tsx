import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

export default function PRISMAStudyAssessment({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const schema = z.object({
    label: z.string().min(1, "Label is required"),
    systematicReview: z.string().min(1, "Systematic review is required"),
    creationDate: z.coerce.date(),
    eligibilityCriteria: z.string().min(1, "Required"),
    assessmentTechnique: z.string().min(1, "Required"),
    studyCharacteristics: z.string().min(1, "Required"),
    extractionMethod: z.string().min(1, "Required"),
    studyResults: z.string().min(1, "Required"),
    qualityAssessment: z.string().min(1, "Required"),
    datasetFileLocation: z.string().url("Must be a valid URL"),
    limitations: z.string().optional().or(z.literal("")),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "label",
        type: "text",
        label: "Label of study assessment dataset",
        placeholder: "e.g., Study assessment - climate migration review 2024",
        required: true,
      },
      {
        name: "systematicReview",
        type: "text",
        label: "Systematic Review",
        placeholder: "Select or enter the URI of the systematic review...",
        required: true,
        description: "URI of the systematic review this assessment belongs to",
      },
      {
        name: "creationDate",
        type: "date",
        label: "Date of assessment completion",
        required: true,
      },
      {
        name: "eligibilityCriteria",
        type: "textarea",
        label: "Eligibility Criteria (PRISMA Item 5)",
        placeholder: "Detailed inclusion and exclusion criteria...",
        required: true,
        description: "Specify the criteria used to determine study eligibility",
        section: {
          title: "Assessment Criteria",
        },
      },
      {
        name: "assessmentTechnique",
        type: "textarea",
        label: "Risk of Bias Assessment (PRISMA Item 11)",
        placeholder: "Risk of bias assessment tools and methods used...",
        required: true,
        description: "Tools and methods for assessing risk of bias",
        section: {
          title: "Assessment Criteria",
        },
      },
      {
        name: "studyCharacteristics",
        type: "textarea",
        label: "Study Characteristics (PRISMA Item 17)",
        placeholder:
          "Summary of study characteristics across included studies...",
        required: true,
        section: {
          title: "Study Data",
        },
      },
      {
        name: "extractionMethod",
        type: "textarea",
        label: "Data Extraction Method",
        placeholder: "Data extraction methodology and reviewer processes...",
        required: true,
        section: {
          title: "Study Data",
        },
      },
      {
        name: "studyResults",
        type: "textarea",
        label: "Study Results (PRISMA Item 19)",
        placeholder: "Individual study results and effect estimates...",
        required: true,
        section: {
          title: "Results",
        },
      },
      {
        name: "qualityAssessment",
        type: "textarea",
        label: "Quality Assessment (PRISMA Item 18)",
        placeholder: "Risk of bias assessment results for included studies...",
        required: true,
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
          "URL where study assessment data is deposited (Zenodo, Figshare, etc.)",
        section: {
          title: "Data Deposit",
        },
      },
      {
        name: "limitations",
        type: "textarea",
        label: "Limitations",
        placeholder:
          "Assessment limitations, modifications, and methodological notes...",
        required: false,
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
        eligibilityCriteria: "",
        assessmentTechnique: "",
        studyCharacteristics: "",
        extractionMethod: "",
        studyResults: "",
        qualityAssessment: "",
        datasetFileLocation: "",
        limitations: "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        const v = value as any;
        if (v.creationDate instanceof Date) {
          v.creationDate = v.creationDate.toISOString().split("T")[0];
        }
        await submit(v);
      },
    },
  });

  return <Form />;
}
