import { ResultItem } from "@/components/np/api-combobox";
import ApiComboboxMultipleExpandable, {
  ApiComboboxSingle,
  SearchEndpoint,
} from "@/components/np/api-combobox";
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
import ky, { KyResponse } from "ky";
import { CheckIcon, ChevronsUpDownIcon, Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

// --- FORRT Claim search via SPARQL -----------------------------------------

const SPARQL_ENDPOINT = "https://query.knowledgepixels.com/repo/full";

async function searchFORRTClaims(term: string): Promise<ResultItem[]> {
  if (term.length < 2) return [];

  const query = `SELECT ?thing ?label WHERE {
  graph ?g { ?thing a <https://w3id.org/sciencelive/o/terms/FORRT-Claim> }
  OPTIONAL { graph ?g2 { ?thing <http://www.w3.org/2000/01/rdf-schema#label> ?label } }
  FILTER(CONTAINS(LCASE(STR(?thing)), '${term.toLowerCase().replace(/'/g, "\\'")}')
    || CONTAINS(LCASE(STR(?label)), '${term.toLowerCase().replace(/'/g, "\\'")}'))
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
    console.error("FORRT claim search error:", e);
    return [];
  }
}

function FORRTClaimCombobox({
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
      searchFORRTClaims(inputValue)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  return (
    <div className="w-full space-y-2">
      <Label htmlFor={id}>Search for a FORRT claim</Label>
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
                Type to search FORRT claims...
              </span>
            )}
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search FORRT claims..."
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

// --- Wikidata search endpoint (for keywords and discipline) ----------------

const wikidataEndpoint: SearchEndpoint[] = [
  {
    name: "wikidata",
    label: "Wikidata",
    url: "https://www.wikidata.org/w/api.php?action=wbsearchentities&language=en&format=json&origin=*&limit=5&search=",
    parser: async (res: KyResponse) => {
      const json = await res.json<{
        search: { concepturi: string; label: string; description: string }[];
      }>();
      return (json.search || []).map((item) => ({
        uri: item.concepturi,
        label: item.label,
        description: item.description,
      }));
    },
  },
];

// --- Study type options ----------------------------------------------------

const STUDY_TYPE_OPTIONS = [
  {
    value: "https://w3id.org/sciencelive/o/terms/Reproduction-Study",
    label:
      "Reproduction Study - direct reproduction: same methodology, same tools",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/Replication-Study",
    label:
      "Replication Study - replication with different methodology or conditions",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/Reproduction-Replication-Study",
    label:
      "Reproduction/Replication Study - study that is both, reproduction and replication",
  },
];

// --- Form component --------------------------------------------------------

export default function FORRTReplication({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const [claimSelection, setClaimSelection] = useState<ResultItem | null>(null);

  const schema = z.object({
    study: z
      .string()
      .min(1, "Study ID is required")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Only letters, numbers, hyphens, and underscores",
      ),
    label: z.string().min(1, "Label is required"),
    type: z.string().min(1, "Must select a study type"),
    claim: z.string().min(1, "Must select a FORRT claim"),
    scope: z.string().min(1, "Scope description is required"),
    methodology: z.string().min(1, "Methodology description is required"),
    deviation: z.string().optional(),
    keywordSelection: z
      .object({ uri: z.string(), label: z.string() })
      .array()
      .optional(),
    st7: z.array(z.object({ keyword: z.string() })).optional(),
    discipline: z.string().optional(),
    disciplineSelection: z
      .object({ uri: z.string(), label: z.string() })
      .array()
      .optional(),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "study",
        type: "text",
        label: "Short URI suffix for study ID",
        placeholder: "e.g. my-study-01",
        required: true,
      },
      {
        name: "label",
        type: "text",
        label: "Label/name of replication study",
        placeholder: "A descriptive name for this study",
        required: true,
      },
      {
        name: "type",
        type: "select",
        label: "Study type",
        required: true,
        options: STUDY_TYPE_OPTIONS,
      },
      {
        name: "claim",
        type: "text",
        label: "FORRT Claim",
        placeholder: "Search for a FORRT claim",
        required: true,
        component: ({ fieldApi }) => (
          <FORRTClaimCombobox
            value={claimSelection}
            onValueChange={(item) => {
              setClaimSelection(item);
              fieldApi.setValue(item?.uri || "");
            }}
          />
        ),
      },
      {
        name: "scope",
        type: "textarea",
        label: "Describe what part of the claim is reproduced/replicated",
        placeholder: "Scope description...",
        required: true,
      },
      {
        name: "methodology",
        type: "textarea",
        label: "Describe how the claim is reproduced/replicated",
        placeholder: "Methodology description...",
        required: true,
      },
      {
        name: "deviation",
        type: "textarea",
        label: "Describe any deviations from original methodology (optional)",
        placeholder: "Deviation description...",
        required: false,
      },
      {
        name: "keywordSelection",
        type: "array",
        label: "Keywords (optional)",
        required: false,
        arrayConfig: {
          minItems: 0,
          itemType: "object",
          objectConfig: {
            fields: [
              { name: "uri", type: "text" },
              { name: "label", type: "text" },
              { name: "description", type: "text", placeholder: "" },
            ],
          },
        },
        component: ({ fieldApi }) => (
          <ApiComboboxMultipleExpandable
            endpoints={wikidataEndpoint}
            value={fieldApi.state.value || []}
            onValueChange={(items) => {
              fieldApi.setValue(items);
            }}
            maxShownItems={5}
            title="Search keywords (Wikidata)"
          />
        ),
      },
      {
        name: "disciplineSelection",
        type: "array",
        label: "Scientific discipline (optional)",
        required: false,
        arrayConfig: {
          minItems: 0,
          itemType: "object",
          objectConfig: {
            fields: [
              { name: "uri", type: "text" },
              { name: "label", type: "text" },
              { name: "description", type: "text", placeholder: "" },
            ],
          },
        },
        component: ({ fieldApi }) => (
          <ApiComboboxSingle
            endpoints={wikidataEndpoint}
            value={fieldApi.state.value || null}
            onValueChange={(item) => {
              fieldApi.setValue(item);
            }}
            title="Search discipline (Wikidata)"
            placeholder="Type to search..."
          />
        ),
      },
      ...NanopubEditorOptionFields,
    ],
    globalWrapper: ShowOptionalWrapper,
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        study: "",
        label: "",
        type: "https://w3id.org/sciencelive/o/terms/Reproduction-Study",
        claim: "",
        scope: "",
        methodology: "",
        deviation: "",
        keywordSelection: [],
        disciplineSelection: undefined,
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        const v = value as any;
        // Map keywordSelection to st7 (repeatable statement placeholder)
        v.st7 = v.keywordSelection?.map((k: { uri: string }) => ({
          keyword: k.uri,
        }));
        delete v.keywordSelection;
        // Map disciplineSelection to discipline placeholder
        v.discipline = v.disciplineSelection?.uri || "";
        delete v.disciplineSelection;
        // Remove empty optional fields
        if (!v.deviation) delete v.deviation;
        if (!v.discipline) delete v.discipline;
        if (!v.st7 || v.st7.length === 0) delete v.st7;
        await submit(v);
      },
    },
  });

  return <Form />;
}
