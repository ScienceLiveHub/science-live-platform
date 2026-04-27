import { DEFAULT_PAGE_SIZE } from "@/hooks/use-pagination";
import { LATEST_ALL, LATEST_BY_TEMPLATES } from "@/lib/queries";
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
  "ODRL_POLICY",
  "ODRL_ACCESS_GRANT",
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
  "RESEARCH_SYNTHESIS",
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
  ODRL_POLICY: "ODRL Access Policy",
  ODRL_ACCESS_GRANT: "ODRL Access Grant",
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
  RESEARCH_SYNTHESIS: "Science Live Research Synthesis",
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
    keys: ["DATASET", "RESEARCH_SOFTWARE", "ODRL_POLICY", "ODRL_ACCESS_GRANT"],
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
      "RESEARCH_SYNTHESIS",
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

export interface UseFeedOptions {
  /** Set of selected template keys to fetch results for. */
  selectedKeys: Set<FeedTemplateKey>;
  /** Current page number (1-based). Defaults to 1. */
  page?: number;
  /** Number of results per page. Defaults to DEFAULT_PAGE_SIZE (10). */
  pageSize?: number;
}

export function useFeed({
  selectedKeys,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseFeedOptions) {
  const [results, setResults] = useState<FeedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Whether there are more results beyond the current page. */
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const offset = (page - 1) * pageSize;
    // Fetch one extra row to detect whether there is a next page
    const limit = pageSize + 1;

    const fetchPromise =
      selectedKeys.size === 0
        ? // No filters selected: fetch all latest nanopubs
          executeBindSparql(
            LATEST_ALL,
            {
              limit: String(limit),
              offset: String(offset),
            },
            NANOPUB_SPARQL_ENDPOINT_FULL,
            controller.signal,
          )
        : // Filters selected: fetch only matching templates
          executeBindSparql(
            LATEST_BY_TEMPLATES,
            {
              templateValues: getTemplateUris([...selectedKeys])
                .map((u) => `(<${u}>)`)
                .join(" "),
              limit: String(limit),
              offset: String(offset),
            },
            NANOPUB_SPARQL_ENDPOINT_FULL,
            controller.signal,
          );

    fetchPromise
      .then((rows) => {
        const moreResultsAvailable = rows.length > pageSize;
        const visibleRows = moreResultsAvailable
          ? rows.slice(0, pageSize)
          : rows;

        setHasMore(moreResultsAvailable);
        setResults(visibleRows as FeedResult[]);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err.message ?? "Failed to load feed");
        setHasMore(false);
        setLoading(false);
      });

    return () => controller.abort();
  }, [selectedKeys, page, pageSize]);

  return { results, loading, error, hasMore };
}
