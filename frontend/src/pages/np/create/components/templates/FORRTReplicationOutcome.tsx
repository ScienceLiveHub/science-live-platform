import { ResultItem } from "@/components/np/api-combobox";
import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFormedible } from "@/hooks/use-formedible";
import ky from "ky";
import { CheckIcon, ChevronsUpDownIcon, Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

// --- FORRT Replication Study search via SPARQL ------------------------------

const SPARQL_ENDPOINT = "https://query.knowledgepixels.com/repo/full";
const SPARQL_QUERY_PREFIX =
  "SELECT ?thing ?label WHERE { graph ?g { ?thing a <https://w3id.org/sciencelive/o/terms/FORRT-Replication-Study> } OPTIONAL { graph ?g2 { ?thing <http://www.w3.org/2000/01/rdf-schema#label> ?label } } FILTER(CONTAINS(LCASE(STR(?thing)), '";
const SPARQL_QUERY_MIDDLE =
  "') || CONTAINS(LCASE(STR(?label)), '";
const SPARQL_QUERY_SUFFIX = "')) } LIMIT 10";

async function searchFORRTStudies(term: string): Promise<ResultItem[]> {
  if (term.length < 2) return [];

  const safeTerm = term.toLowerCase().replace(/'/g, "\\'");
  const query = `${SPARQL_QUERY_PREFIX}${safeTerm}${SPARQL_QUERY_MIDDLE}${safeTerm}${SPARQL_QUERY_SUFFIX}`;

  try {
    const res = await ky.post(SPARQL_ENDPOINT, {
      body: new URLSearchParams({ query }),
      headers: {
        Accept: "application/sparql-results+xml",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const text = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    const results = xmlDoc.getElementsByTagName("result");

    return Array.from(results).map((result) => {
      const uri =
        result.querySelector("binding[name='thing'] uri")?.textContent || "";
      const label =
        result.querySelector("binding[name='label'] literal")?.textContent ||
        uri;
      return { uri, label };
    });
  } catch (e) {
    console.error("FORRT study search error:", e);
    return [];
  }
}

function FORRTStudyCombobox({
  value,
  onValueChange,
}: {
  value: ResultItem | null;
  onValueChange: (item: ResultItem | null) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!inputValue || inputValue.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsLoading(true);
      searchFORRTStudies(inputValue)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  return (
    <div className="w-full space-y-2">
      <Label htmlFor={id}>Search for a FORRT replication study</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value ? (
              <span className="truncate">{value.label}</span>
            ) : (
              <span className="text-muted-foreground/80">
                Type to search FORRT studies...
              </span>
            )}
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search FORRT studies..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex justify-center py-6 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {inputValue.length < 2
                      ? "Type at least 2 characters to search..."
                      : "No results found."}
                  </CommandEmpty>
                  <CommandGroup>
                    {results.map((item) => (
                      <CommandItem
                        key={item.uri}
                        value={item.uri}
                        onSelect={() => {
                          onValueChange(item);
                          setOpen(false);
                        }}
                      >
                        <span className="truncate">{item.label}</span>
                        {value?.uri === item.uri && (
                          <CheckIcon size={16} className="ml-auto" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// --- Restricted choice options ---------------------------------------------

const VALIDATION_STATUS_OPTIONS = [
  {
    value: "https://w3id.org/sciencelive/o/terms/Validated",
    label: "validated",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/PartiallySupported",
    label: "partially supported",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/Contradicted",
    label: "contradicted",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/Inconclusive",
    label: "inconclusive",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/NotTested",
    label: "not tested",
  },
];

const CONFIDENCE_LEVEL_OPTIONS = [
  {
    value: "https://w3id.org/sciencelive/o/terms/VeryHighConfidence",
    label: "very high - Extensive evidence, high agreement with original",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/HighConfidence",
    label: "high - Strong evidence, mostly agrees with original",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/Moderate",
    label: "moderate - Adequate evidence, partial agreement",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/LowConfidence",
    label: "low - Limited evidence, significant disagreement",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/VeryLowConfidence",
    label: "very low - Minimal evidence, major disagreement",
  },
];

// --- Form component --------------------------------------------------------

export default function FORRTReplicationOutcome({
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
          <FORRTStudyCombobox
            value={studySelection}
            onValueChange={(item) => {
              setStudySelection(item);
              fieldApi.setValue(item?.uri || "");
            }}
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
        date: "",
        validationStatus: "",
        confidenceLevel: "",
        conclusion: "",
        evidence: "",
        limitations: "",
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
