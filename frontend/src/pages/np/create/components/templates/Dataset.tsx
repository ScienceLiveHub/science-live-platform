import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import { validUriPlaceholder } from "@/lib/validation";
import ky from "ky";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

// Common ISO 639-1 languages with OMG spec URIs
const LANGUAGE_OPTIONS = [
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/en", label: "English" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/de", label: "German" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/fr", label: "French" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/es", label: "Spanish" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/it", label: "Italian" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/pt", label: "Portuguese" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/nl", label: "Dutch" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/pl", label: "Polish" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/ru", label: "Russian" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/zh", label: "Chinese" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/ja", label: "Japanese" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/ko", label: "Korean" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/ar", label: "Arabic" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/hi", label: "Hindi" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/sv", label: "Swedish" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/no", label: "Norwegian" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/da", label: "Danish" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/fi", label: "Finnish" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/cs", label: "Czech" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/el", label: "Greek" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/tr", label: "Turkish" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/he", label: "Hebrew" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/uk", label: "Ukrainian" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/hu", label: "Hungarian" },
  { value: "https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/ro", label: "Romanian" },
];

// Search ontology terms using EBI OLS API
async function searchDomains(
  query: string,
): Promise<{ value: string; label: string }[]> {
  if (!query || query.length < 3) return [];

  try {
    const data = (await ky
      .get(
        `https://www.ebi.ac.uk/ols4/api/search?q=${encodeURIComponent(query)}&ontology=omit,efo&rows=10&fieldList=iri,label,ontology_name`,
      )
      .json()) as {
      response?: {
        docs?: Array<{ iri?: string; label?: string; ontology_name?: string }>;
      };
    };

    return (
      data?.response?.docs
        ?.filter((doc) => doc.iri && doc.label)
        .map((doc) => ({
          value: doc.iri!,
          label: `${doc.label} (${doc.ontology_name?.toUpperCase()})`,
        })) || []
    );
  } catch (error) {
    console.warn("Failed to search ontology terms:", error);
    return [];
  }
}

export default function Dataset({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const schema = z.object({
    // Required fields
    fdo: validUriPlaceholder,
    label: z.string().min(3).max(300),
    description: z.string().min(10).max(2000),
    // Optional fields
    contactEmail: z.string().email().optional().or(z.literal("")),
    version: z.string().optional().or(z.literal("")),
    language: z.string().optional().or(z.literal("")),
    domain: z.string().optional().or(z.literal("")),
    publisher: z.string().url().optional().or(z.literal("")),
    funder: z.string().url().optional().or(z.literal("")),
    project: z.string().optional().or(z.literal("")),
    fairProfile: z.string().optional().or(z.literal("")),
    // Repeatable fields
    creators: z.array(z.string().url()).optional(),
    contributors: z.array(z.string().url()).optional(),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "fdo",
        type: "text",
        label: "Dataset Identifier",
        placeholder: "e.g., 10.5281/zenodo.10891137 or my-dataset-2024",
        required: true,
        description:
          "DOI or short identifier for this dataset (letters, numbers, hyphens, dots)",
      },
      {
        name: "label",
        type: "text",
        label: "Dataset Title",
        placeholder: "e.g., BigEarthNet v2.0: Large-Scale Sentinel Benchmark Archive",
        required: true,
        description: "The full name or title of the dataset",
      },
      {
        name: "description",
        type: "textarea",
        label: "Description",
        placeholder: "Describe the dataset, its contents, and purpose...",
        required: true,
        description: "A detailed description of the dataset",
      },
      {
        name: "version",
        type: "text",
        label: "Version",
        placeholder: "e.g., 2.0.0",
        required: false,
        section: {
          title: "Dataset Details",
        },
      },
      {
        name: "contactEmail",
        type: "text",
        label: "Contact Email",
        placeholder: "e.g., contact@example.org",
        required: false,
        section: {
          title: "Dataset Details",
        },
      },
      {
        name: "language",
        type: "autocomplete",
        label: "Language",
        placeholder: "Start typing to search languages...",
        required: false,
        description: "Language of the dataset content",
        section: {
          title: "Dataset Details",
        },
        autocompleteConfig: {
          options: LANGUAGE_OPTIONS,
          minChars: 1,
          maxResults: 10,
          allowCustom: false,
          noOptionsText: "No matching language found",
        },
      },
      {
        name: "domain",
        type: "autocomplete",
        label: "Subject / Domain",
        placeholder: "Type to search (e.g., Earth Sciences)...",
        required: false,
        description: "The research domain or subject area",
        section: {
          title: "Dataset Details",
        },
        autocompleteConfig: {
          asyncOptions: searchDomains,
          minChars: 3,
          maxResults: 10,
          debounceMs: 500,
          allowCustom: false,
          noOptionsText: "No matching domain found",
          loadingText: "Searching...",
        },
      },
      {
        type: "array",
        name: "creators",
        label: "Creators",
        required: false,
        defaultValue: [],
        section: {
          title: "People & Organizations",
        },
        arrayConfig: {
          defaultValue: "",
          minItems: 0,
          maxItems: 20,
          itemType: "text",
          addButtonLabel: "Add Creator",
          itemLabel: "Creator ORCID",
          itemPlaceholder: "https://orcid.org/0000-0000-0000-0000",
        },
      },
      {
        type: "array",
        name: "contributors",
        label: "Contributors",
        required: false,
        defaultValue: [],
        section: {
          title: "People & Organizations",
        },
        arrayConfig: {
          defaultValue: "",
          minItems: 0,
          maxItems: 20,
          itemType: "text",
          addButtonLabel: "Add Contributor",
          itemLabel: "Contributor ORCID",
          itemPlaceholder: "https://orcid.org/0000-0000-0000-0000",
        },
      },
      {
        name: "publisher",
        type: "text",
        label: "Publisher (ROR)",
        placeholder: "https://ror.org/... (ROR identifier)",
        required: false,
        description: "ROR identifier of the publishing organization",
        section: {
          title: "People & Organizations",
        },
      },
      {
        name: "funder",
        type: "text",
        label: "Funder (ROR)",
        placeholder: "https://ror.org/... (ROR identifier)",
        required: false,
        description: "ROR identifier of the funding institution",
        section: {
          title: "People & Organizations",
        },
      },
      {
        name: "project",
        type: "text",
        label: "Project",
        placeholder: "Select or enter project URI...",
        required: false,
        description: "Associated research project",
        section: {
          title: "People & Organizations",
        },
      },
      {
        name: "fairProfile",
        type: "text",
        label: "FAIR Implementation Profile",
        placeholder: "Select FAIR profile...",
        required: false,
        description: "FAIR Implementation Profile this dataset conforms to",
        section: {
          title: "Compliance",
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
        fdo: "",
        label: "",
        description: "",
        contactEmail: "",
        version: "",
        language: "",
        domain: "",
        publisher: "",
        funder: "",
        project: "",
        fairProfile: "",
        creators: [],
        contributors: [],
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        await submit(value);
      },
    },
  });

  return <Form />;
}
