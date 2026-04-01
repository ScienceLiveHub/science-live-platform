import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

export default function PRISMADatabaseSearch({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const schema = z.object({
    label: z.string().min(1, "Label is required"),
    systematicReview: z.string().min(1, "Systematic review is required"),
    searchStrategy: z.string().min(1, "Search strategy is required"),
    databaseUrl: z.string().url("Must be a valid URL"),
    date: z.coerce.date(),
    query: z.string().min(1, "Search query is required"),
    retrievedRecordCount: z.string().min(1, "Record count is required"),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "label",
        type: "text",
        label: "Label of the search",
        placeholder: "e.g., PubMed search for climate migration studies",
        required: true,
      },
      {
        name: "systematicReview",
        type: "text",
        label: "Systematic Review",
        placeholder: "Select or enter the URI of the systematic review...",
        required: true,
        description: "URI of the systematic review this search belongs to",
      },
      {
        name: "searchStrategy",
        type: "text",
        label: "Search Strategy",
        placeholder: "Select or enter the URI of the search strategy...",
        required: true,
        description:
          "URI of the search strategy this database search follows",
      },
      {
        name: "databaseUrl",
        type: "text",
        label: "Database URL",
        placeholder: "https://pubmed.ncbi.nlm.nih.gov/",
        required: true,
        description: "URL of the database searched",
        section: {
          title: "Search Details",
        },
      },
      {
        name: "date",
        type: "date",
        label: "Date when search was conducted",
        required: true,
        section: {
          title: "Search Details",
        },
      },
      {
        name: "query",
        type: "textarea",
        label: "Search query",
        placeholder:
          "Paste the exact search string as executed (copy-paste from database interface)...",
        required: true,
        description: "The exact search query string as run in the database",
        section: {
          title: "Search Details",
        },
      },
      {
        name: "retrievedRecordCount",
        type: "text",
        label: "Number of records retrieved",
        placeholder: "e.g., 1523",
        required: true,
        description: "Total number of records returned by this search",
        section: {
          title: "Results",
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
        searchStrategy: "",
        databaseUrl: "",
        date: undefined as unknown as Date,
        query: "",
        retrievedRecordCount: "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        const v = value as any;
        if (v.date instanceof Date) {
          v.date = v.date.toISOString().split("T")[0];
        }
        await submit(v);
      },
    },
  });

  return <Form />;
}
