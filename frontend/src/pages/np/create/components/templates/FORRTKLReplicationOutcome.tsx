import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { ResultItem } from "@/components/np/api-endpoints";
import { QueryComboboxField } from "@/components/np/query-combobox";
import { useFormedible } from "@/hooks/use-formedible";
import { useState } from "react";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";
import {
  CONFIDENCE_LEVEL_OPTIONS,
  searchFORRTStudies,
  VALIDATION_STATUS_OPTIONS,
} from "./FORRTReplicationOutcome";

// --- Restricted choice options -----------------------------------------------

const ANALYSIS_TYPE_OPTIONS = [
  {
    value: "https://w3id.org/sciencelive/o/terms/dtreg-DataAnalysis",
    label: "Data Analysis",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/dtreg-DataPreprocessing",
    label: "Data Preprocessing",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/dtreg-DescriptiveStatistics",
    label: "Descriptive Statistics",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/dtreg-GroupComparison",
    label: "Group Comparison (t-test, ANOVA, etc.)",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/dtreg-RegressionAnalysis",
    label: "Regression Analysis",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/dtreg-CorrelationAnalysis",
    label: "Correlation Analysis",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/dtreg-MultilevelAnalysis",
    label: "Multilevel Analysis (mixed/hierarchical models)",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/dtreg-ClassPrediction",
    label: "Class Prediction",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/dtreg-ClassDiscovery",
    label: "Class Discovery (clustering)",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/dtreg-AlgorithmEvaluation",
    label: "Algorithm Evaluation",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/dtreg-FactorAnalysis",
    label: "Factor Analysis",
  },
];

// --- Form component ----------------------------------------------------------

export default function FORRTKLReplicationOutcome({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const [studySelection, setStudySelection] = useState<ResultItem | null>(null);

  const schema = z.object({
    outcome: z
      .string()
      .min(1, "Outcome ID is required")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Only letters, numbers, hyphens, and underscores",
      ),
    label: z.string().min(1, "Label is required"),
    study: z.string().min(1, "Must select a study"),
    repo: z.string().url("Must be a valid URL"),
    date: z.coerce.date(),
    validationStatus: z.string().min(1, "Must select a validation status"),
    conclusion: z.string().min(1, "Conclusion is required"),
    evidence: z.string().min(1, "Evidence is required"),
    confidenceLevel: z.string().min(1, "Must select a confidence level"),
    limitations: z.string().optional(),
    // Knowledge Loom fields
    "kl-proof": z.url("Must be a valid URL").optional().or(z.literal("")),
    "kl-analysis-type": z.string().optional(),
    "kl-key-result": z.string().optional(),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "outcome",
        type: "text",
        label: "Short URI suffix for outcome ID",
        placeholder: "e.g. my-outcome-01",
        required: true,
      },
      {
        name: "label",
        type: "text",
        label: "Plain-text label for the outcome",
        placeholder: "A descriptive label for this outcome",
        required: true,
      },
      {
        name: "study",
        type: "text",
        label: "Replication Study",
        placeholder: "Search for a FORRT replication study",
        required: true,
        component: ({ fieldApi }) => (
          <QueryComboboxField
            value={studySelection}
            onValueChange={(item) => {
              setStudySelection(item);
              fieldApi.setValue(item?.uri || "");
            }}
            searchFunction={searchFORRTStudies}
            labelText="Search for a FORRT replication study"
            instructionText="Search FORRT studies..."
            placeholderText="Type to search FORRT studies..."
          />
        ),
      },
      {
        name: "repo",
        type: "text",
        label: "Repository URL",
        placeholder: "https://github.com/...",
        required: true,
      },
      {
        name: "date",
        type: "date",
        label: "Completion date",
        required: true,
      },
      {
        name: "validationStatus",
        type: "select",
        label: "Validation status",
        required: true,
        options: VALIDATION_STATUS_OPTIONS,
      },
      {
        name: "confidenceLevel",
        type: "select",
        label: "Confidence level",
        required: true,
        options: CONFIDENCE_LEVEL_OPTIONS,
      },
      {
        name: "conclusion",
        type: "textarea",
        label: "Describe the overall conclusion about the original claim",
        placeholder: "Conclusion...",
        required: true,
      },
      {
        name: "evidence",
        type: "textarea",
        label: "Describe the evidence that supports your conclusion",
        placeholder: "Evidence...",
        required: true,
      },
      {
        name: "limitations",
        type: "textarea",
        label: "Describe what limits the conclusions of the study (optional)",
        placeholder: "Limitations...",
        required: false,
      },
      // --- Knowledge Loom evidence section ---
      {
        name: "kl-proof",
        type: "text",
        label: "Machine-readable proof URL (optional)",
        placeholder: "https://gitlab.com/.../raw/main/result.json",
        required: false,
        section: { title: "Machine-Readable Evidence (Knowledge Loom)" },
      },
      {
        name: "kl-analysis-type",
        type: "select",
        label: "Statistical analysis type (optional)",
        required: false,
        options: ANALYSIS_TYPE_OPTIONS,
      },
      {
        name: "kl-key-result",
        type: "textarea",
        label: "Key numerical result (optional)",
        placeholder: "e.g. F=7.285, p<0.001",
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
        outcome: "",
        label: "",
        study: "",
        repo: "",
        date: undefined as unknown as Date,
        validationStatus: "",
        confidenceLevel: "",
        conclusion: "",
        evidence: "",
        limitations: "",
        "kl-proof": "",
        "kl-analysis-type": "",
        "kl-key-result": "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        const submitData: Record<string, any> = { ...value };
        // Convert Date to ISO date string (YYYY-MM-DD) for the template
        if (submitData.date instanceof Date) {
          submitData.date = submitData.date.toISOString().split("T")[0];
        }
        if (!submitData.limitations) delete submitData.limitations;
        await submit(submitData);
      },
    },
  });

  return <Form />;
}
