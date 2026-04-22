import { LATEST_BY_TEMPLATES } from "@/lib/queries";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_FULL } from "@/lib/sparql";
import {
  LEGACY_TEMPLATE_URIS,
  TEMPLATE_URI,
} from "@/pages/np/create/components/templates/registry-metadata";
import { useEffect, useState } from "react";

/** Template keys that are shown in the feed (excludes utility templates). */
export const FEED_TEMPLATE_KEYS = [
  "AIDA_SENTENCE",
  "CITATION_CITO",
  "ANNOTATE_QUOTATION",
  "COMMENT_PAPER",
  "GEO_COVERAGE",
  "DATASET",
  "RESEARCH_SOFTWARE",
  "PICO_RESEARCH_QUESTION",
  "PCC_RESEARCH_QUESTION",
  "PRISMA_SEARCH_STRATEGY",
  "PRISMA_DATABASE_SEARCH",
  "PRISMA_SEARCH_EXECUTION_DATASET",
  "PRISMA_STUDY_INCLUSION",
  "PRISMA_STUDY_ASSESSMENT",
  "PRISMA_FULL_SCREENING",
  "FORRT_CLAIM",
  "FORRT_REPLICATION",
  "FORRT_REPLICATION_OUTCOME",
  "FORRT_KL_REPLICATION",
  "FORRT_KL_REPLICATION_OUTCOME",
] as const satisfies (keyof typeof TEMPLATE_URI)[];

export type FeedTemplateKey = (typeof FEED_TEMPLATE_KEYS)[number];

/** Human-readable labels for the feed checkboxes. */
export const FEED_TEMPLATE_LABELS: Record<FeedTemplateKey, string> = {
  AIDA_SENTENCE: "AIDA Sentence",
  CITATION_CITO: "Citation (CiTO)",
  ANNOTATE_QUOTATION: "Annotate Quotation",
  COMMENT_PAPER: "Comment on Paper",
  GEO_COVERAGE: "Geographical Coverage",
  DATASET: "FAIR Dataset",
  RESEARCH_SOFTWARE: "Research Software",
  PICO_RESEARCH_QUESTION: "PICO Research Question",
  PCC_RESEARCH_QUESTION: "PCC Research Question",
  PRISMA_SEARCH_STRATEGY: "PRISMA Search Strategy",
  PRISMA_DATABASE_SEARCH: "PRISMA Database Search",
  PRISMA_SEARCH_EXECUTION_DATASET: "PRISMA Search Execution Dataset",
  PRISMA_STUDY_INCLUSION: "PRISMA Study Inclusion",
  PRISMA_STUDY_ASSESSMENT: "PRISMA Study Assessment",
  PRISMA_FULL_SCREENING: "PRISMA Full Screening",
  FORRT_CLAIM: "FORRT Claim",
  FORRT_REPLICATION: "FORRT Replication Study",
  FORRT_REPLICATION_OUTCOME: "FORRT Replication Outcome",
  FORRT_KL_REPLICATION: "FORRT KL Replication Study",
  FORRT_KL_REPLICATION_OUTCOME: "FORRT KL Replication Outcome",
};

/** Group labels for organizing checkboxes by category. */
export const FEED_GROUPS: { label: string; keys: FeedTemplateKey[] }[] = [
  {
    label: "Core",
    keys: [
      "AIDA_SENTENCE",
      "CITATION_CITO",
      "ANNOTATE_QUOTATION",
      "COMMENT_PAPER",
      "GEO_COVERAGE",
    ],
  },
  {
    label: "Data & Software",
    keys: ["DATASET", "RESEARCH_SOFTWARE"],
  },
  {
    label: "Systematic Review (PRISMA)",
    keys: [
      "PICO_RESEARCH_QUESTION",
      "PCC_RESEARCH_QUESTION",
      "PRISMA_SEARCH_STRATEGY",
      "PRISMA_DATABASE_SEARCH",
      "PRISMA_SEARCH_EXECUTION_DATASET",
      "PRISMA_STUDY_INCLUSION",
      "PRISMA_STUDY_ASSESSMENT",
      "PRISMA_FULL_SCREENING",
    ],
  },
  {
    label: "Replication (FORRT)",
    keys: [
      "FORRT_CLAIM",
      "FORRT_REPLICATION",
      "FORRT_REPLICATION_OUTCOME",
      "FORRT_KL_REPLICATION",
      "FORRT_KL_REPLICATION_OUTCOME",
    ],
  },
];

export interface FeedResult {
  np: string;
  label: string;
  date: string;
  creator: string;
  description?: string;
  template?: string;
}

/** Collect all URIs (current + legacy) for the selected template keys. */
function getTemplateUris(keys: FeedTemplateKey[]): string[] {
  const uris: string[] = [];
  for (const key of keys) {
    uris.push(TEMPLATE_URI[key]);
    const legacy = LEGACY_TEMPLATE_URIS[key];
    if (legacy) {
      uris.push(...legacy);
    }
  }
  return uris;
}

export function useFeed(selectedKeys: Set<FeedTemplateKey>) {
  const [results, setResults] = useState<FeedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedKeys.size === 0) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const uris = getTemplateUris([...selectedKeys]);
    const templateValues = uris.map((u) => `(<${u}>)`).join(" ");

    executeBindSparql(
      LATEST_BY_TEMPLATES,
      { templateValues },
      NANOPUB_SPARQL_ENDPOINT_FULL,
      controller.signal,
    )
      .then((rows) => {
        setResults(rows as FeedResult[]);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err.message ?? "Failed to load feed");
        setLoading(false);
      });

    return () => controller.abort();
  }, [selectedKeys]);

  return { results, loading, error };
}
