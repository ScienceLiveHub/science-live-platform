import { ResultItem } from "@/components/np/api-combobox";
import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import ky from "ky";
import { useState } from "react";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

// --- AIDA sentence search via SPARQL ---------------------------------------

const SPARQL_ENDPOINT = "https://query.knowledgepixels.com/repo/full";
const SPARQL_QUERY_PREFIX =
  "SELECT ?thing WHERE { graph ?g { ?thing a <http://purl.org/petapico/o/hycl#AIDA-Sentence> } . FILTER(CONTAINS(LCASE(STR(?thing)), '";
const SPARQL_QUERY_SUFFIX = "')) } LIMIT 10";

function decodeAidaUri(uri: string): string {
  const aidaPrefix = "http://purl.org/aida/";
  if (uri.startsWith(aidaPrefix)) {
    try {
      return decodeURIComponent(
        uri.substring(aidaPrefix.length).replaceAll("+", " "),
      );
    } catch {
      return uri;
    }
  }
  return uri;
}

async function searchAidaSentences(term: string): Promise<ResultItem[]> {
  if (term.length < 2) return [];

  const query = `${SPARQL_QUERY_PREFIX}${term.toLowerCase().replace(/'/g, "\\'")}${SPARQL_QUERY_SUFFIX}`;

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
      return { uri, label: decodeAidaUri(uri) };
    });
  } catch (e) {
    console.error("AIDA sentence search error:", e);
    return [];
  }
}

// --- FORRT Claim form ------------------------------------------------------

const FORRT_TYPE_OPTIONS = [
  {
    value:
      "https://w3id.org/sciencelive/o/terms/computational_performance-FORRT-Claim",
    label: "computational performance (Computational & Performance)",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/scalability-FORRT-Claim",
    label: "scalability (Computational & Performance)",
  },
];

export default function FORRTClaim({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const [aidaSelection, setAidaSelection] = useState<ResultItem | null>(null);

  const schema = z.object({
    claim: z
      .string()
      .min(1, "Claim ID is required")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Only letters, numbers, hyphens, and underscores",
      ),
    label: z.string().min(1, "Label is required"),
    aida: z.string().min(1, "Must select an AIDA sentence"),
    forrtType: z.string().min(1, "Must select a FORRT type"),
    source: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "claim",
        type: "text",
        label: "Short URI suffix as claim ID",
        placeholder: "e.g. my-claim-01",
        required: true,
      },
      {
        name: "label",
        type: "text",
        label: "Label of the claim (to find it later)",
        placeholder: "A descriptive label for this claim",
        required: true,
      },
      {
        name: "aida",
        type: "text",
        label: "AIDA Sentence",
        placeholder: "Search or paste an AIDA sentence URI",
        required: true,
        component: ({ fieldApi }) => (
          <AIDASentenceField
            value={aidaSelection}
            onValueChange={(item) => {
              setAidaSelection(item);
              fieldApi.setValue(item?.uri || "");
            }}
          />
        ),
      },
      {
        name: "forrtType",
        type: "select",
        label: "Type of FORRT claim",
        required: true,
        options: FORRT_TYPE_OPTIONS,
      },
      {
        name: "source",
        type: "text",
        label: "Source URI (optional)",
        placeholder: "https://doi.org/...",
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
        claim: "",
        label: "",
        aida: "",
        forrtType: "",
        source: "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        const submitData: Record<string, any> = { ...value };
        // Remove empty optional source
        if (!submitData.source) {
          delete submitData.source;
        }
        await submit(submitData);
      },
    },
  });

  return <Form />;
}

// --- AIDA Sentence search combobox -----------------------------------------
// Uses ApiComboboxSingle UI pattern but with custom SPARQL search

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
import { CheckIcon, ChevronsUpDownIcon, Loader2 } from "lucide-react";
import { useEffect, useId } from "react";

function AIDASentenceField({
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
      searchAidaSentences(inputValue)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  return (
    <div className="w-full space-y-2">
      <Label htmlFor={id}>Search for an AIDA sentence</Label>
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
                Type to search AIDA sentences...
              </span>
            )}
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search AIDA sentences..."
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
