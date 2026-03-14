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

// --- SPARQL search helpers -------------------------------------------------

const SPARQL_ENDPOINT = "https://query.knowledgepixels.com/repo/full";

async function sparqlSearch(
  typeUri: string,
  term: string,
): Promise<ResultItem[]> {
  if (term.length < 2) return [];

  const safeTerm = term.toLowerCase().replace(/'/g, "\\'");
  const query = `SELECT ?thing ?label WHERE {
  graph ?g { ?thing a <${typeUri}> }
  OPTIONAL { graph ?g2 { ?thing <http://www.w3.org/2000/01/rdf-schema#label> ?label } }
  FILTER(CONTAINS(LCASE(STR(?thing)), '${safeTerm}')
    || CONTAINS(LCASE(STR(?label)), '${safeTerm}'))
} LIMIT 10`;

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
    console.error("SPARQL search error:", e);
    return [];
  }
}

// --- Generic SPARQL combobox -----------------------------------------------

function SparqlCombobox({
  typeUri,
  value,
  onValueChange,
  title,
  placeholder,
}: {
  typeUri: string;
  value: ResultItem | null;
  onValueChange: (item: ResultItem | null) => void;
  title: string;
  placeholder: string;
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
      sparqlSearch(typeUri, inputValue)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue, typeUri]);

  return (
    <div className="w-full space-y-2">
      <Label htmlFor={id}>{title}</Label>
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
              <span className="text-muted-foreground/80">{placeholder}</span>
            )}
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
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

// --- Form component --------------------------------------------------------

export default function SystematicDbSearch({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const [reviewSelection, setReviewSelection] = useState<ResultItem | null>(
    null,
  );
  const [strategySelection, setStrategySelection] =
    useState<ResultItem | null>(null);

  const schema = z.object({
    label: z.string().min(1, "Label is required"),
    systematicReview: z.string().min(1, "Must select a systematic review"),
    searchStrategy: z.string().min(1, "Must select a search strategy"),
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
        placeholder: "e.g. PubMed search - climate change health impacts",
        required: true,
      },
      {
        name: "systematicReview",
        type: "text",
        label: "Systematic Review",
        required: true,
        component: ({ fieldApi }) => (
          <SparqlCombobox
            typeUri="http://purl.org/spar/fabio/SystematicReview"
            value={reviewSelection}
            onValueChange={(item) => {
              setReviewSelection(item);
              fieldApi.setValue(item?.uri || "");
            }}
            title="Search for a systematic review"
            placeholder="Type to search systematic reviews..."
          />
        ),
      },
      {
        name: "searchStrategy",
        type: "text",
        label: "Search Strategy",
        required: true,
        component: ({ fieldApi }) => (
          <SparqlCombobox
            typeUri="https://w3id.org/sciencelive/o/terms/SystematicReviewSearchStrategy"
            value={strategySelection}
            onValueChange={(item) => {
              setStrategySelection(item);
              fieldApi.setValue(item?.uri || "");
            }}
            title="Search for a search strategy"
            placeholder="Type to search strategies..."
          />
        ),
      },
      {
        name: "databaseUrl",
        type: "text",
        label: "Database URL",
        placeholder: "https://pubmed.ncbi.nlm.nih.gov/",
        required: true,
      },
      {
        name: "date",
        type: "date",
        label: "Date when search was conducted",
        required: true,
      },
      {
        name: "query",
        type: "textarea",
        label:
          "Exact search string as executed (copy-paste from database interface)",
        placeholder: '(climate change) AND (health impacts) AND ("systematic review")',
        required: true,
      },
      {
        name: "retrievedRecordCount",
        type: "text",
        label: "Number of records retrieved from this database",
        placeholder: "e.g. 1234",
        required: true,
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
        const submitData: Record<string, any> = { ...value };
        if (submitData.date instanceof Date) {
          submitData.date = submitData.date.toISOString().split("T")[0];
        }
        await submit(submitData);
      },
    },
  });

  return <Form />;
}
