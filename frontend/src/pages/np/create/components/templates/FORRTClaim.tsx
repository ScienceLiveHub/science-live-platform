import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { ResultItem } from "@/components/np/api-endpoints";
import { QueryComboboxField } from "@/components/np/query-combobox";
import { useFormedible } from "@/hooks/use-formedible";
import { NANOPUB_SPARQL_ENDPOINT_FULL } from "@/lib/sparql";
import ky from "ky";
import { useState } from "react";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

// --- AIDA sentence search via SPARQL ---------------------------------------

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
    const res = await ky.post(NANOPUB_SPARQL_ENDPOINT_FULL, {
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
        required: true,
        component: ({ fieldApi }) => (
          <QueryComboboxField
            value={aidaSelection}
            onValueChange={(item) => {
              setAidaSelection(item);
              fieldApi.setValue(item?.uri || "");
            }}
            searchFunction={searchAidaSentences}
            labelText="Search for an AIDA sentence"
            instructionText="Search AIDA sentences..."
            placeholderText="Type to search AIDA sentences..."
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
