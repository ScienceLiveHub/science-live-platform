/**
 * Template metadata shared across all workspaces
 * This file contains no React imports and can be safely imported by non-React workspaces
 */

export interface NanopubTemplateMetadata {
  name: string;
  description: string;
  moreDescription?: string;
  category: string;
  icon: string;
  recommended?: boolean;
  keywords?: string[];
}

/** Nanopub URI of each known template (current/latest version used for creation or utility) */
export const TEMPLATE_URI = {
  // Core templates
  CITATION_CITO:
    "https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo",
  ANNOTATE_QUOTATION:
    "https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU",
  COMMENT_PAPER:
    "http://purl.org/np/RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI",
  AIDA_SENTENCE:
    "https://w3id.org/np/RALmXhDw3rHcMveTgbv8VtWxijUHwnSqhCmtJFIPKWVaA",
  GEO_COVERAGE:
    "https://w3id.org/np/RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao",

  // Data & Software
  DATASET: "https://w3id.org/np/RAuVB37yyAuAlgusrUAoG84JI4_EfrEqIkpEZYDpSz3d8",
  RESEARCH_SOFTWARE:
    "https://w3id.org/np/RABBzVTxosLGT4YBCfdfNd6LyuOOTe2EVOTtWJMyOoZHk",

  // PRISMA Systematic Review
  PICO_RESEARCH_QUESTION:
    "https://w3id.org/np/RA5e5XeXy_-aNK5giB7kBAEQslTLVydHeM4YYEzhmEE2w",
  PCC_RESEARCH_QUESTION:
    "https://w3id.org/np/RAmR-xqMgOq3oTJmOVDQFL2p5usID6zqRapizHy0UJb04",
  PRISMA_SEARCH_STRATEGY:
    "https://w3id.org/np/RAvcJKm2DZPEKOBevGdPGcKL6sEw04JXwgzx2lH5DE5LU",
  PRISMA_DATABASE_SEARCH:
    "https://w3id.org/np/RA8MyCoRqMdgGqqOwN4MIQfe6Htwt5FPgiHXlXK4RKiic",
  PRISMA_SEARCH_EXECUTION_DATASET:
    "https://w3id.org/np/RAV_H3udaSzxYOhhR0t-q7PKS6URwauD_Z5sMLbHmM2x0",
  PRISMA_STUDY_INCLUSION:
    "https://w3id.org/np/RAivw_N13pxVoXRMP6Y3ErfA--Z011qMqwKccfiKVxF0w",
  PRISMA_STUDY_ASSESSMENT:
    "https://w3id.org/np/RAwQj3SNiopwPrHXfoRT2JtYZSt-5JsDHjBDW6nYz_rDE",
  PRISMA_FULL_SCREENING:
    "https://w3id.org/np/RAh4iIKHSi30apMADmsYrdyeTd1hvvYZaRRfsKLZX1jsw",

  // FORRT Replication
  FORRT_CLAIM:
    "https://w3id.org/np/RAVdxfm3fgFahBItmNmJX_Xkmg1xlimDtoSMjZgNIs2bQ",
  FORRT_REPLICATION:
    "https://w3id.org/np/RAuLEjPp-4dTvPwMkfHggTto1CgjIftiGRAgHlyeEonjQ",
  FORRT_REPLICATION_OUTCOME:
    "https://w3id.org/np/RA2zljn0Nw9SadppOyxZoh-_Rxosslrq-vYG-p9SttnJE",

  // Utility templates (not shown in the nanopub editor)
  COMMENT: "http://purl.org/np/RA3gQDMnYbKCTiQeiUYJYBaH6HUhz8f3HIg71itlsZDgA",
  APPROVE_OR_DISAPPROVE:
    "http://purl.org/np/RAx2PsXNbCcxYh3sOSScV9H0-tqyETuKjyHsgD6FPC3_E",
  APPROVE_INTRO:
    "http://purl.org/np/RAOmr2G967CF1gAfHH49W1VJdAdjE967OxWm7G_-Vq6yc",
};

/**
 * Legacy/previous versions of template URIs.
 * Used for viewing nanopubs created with older template versions.
 * Maps template key to array of legacy URIs.
 */
export const LEGACY_TEMPLATE_URIS: Partial<
  Record<keyof typeof TEMPLATE_URI, string[]>
> = {
  AIDA_SENTENCE: [
    "https://w3id.org/np/RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE",
  ],
  PICO_RESEARCH_QUESTION: [
    "https://w3id.org/np/RAfZfE1gbUtc35W7xT12XTO0ptZwycN2-jj7Jow6COAoQ",
  ],
};
/**
 * Template metadata without React components
 * Non-React workspaces (e.g., Zotero) should import this directly
 *
 * Grouped by category:
 *   1. Core (Citation, Annotation, Scientific)
 *   2. Data & Software
 *   3. PRISMA Systematic Review
 *   4. FORRT Replication
 */
export const TEMPLATE_METADATA: Record<string, NanopubTemplateMetadata> = {
  // ── Core ───────────────────────────────────────────────────────────
  [TEMPLATE_URI.CITATION_CITO]: {
    name: "Citation with CiTO",
    description:
      "Declare citations between papers using Citation Typing Ontology",
    category: "Citation",
    icon: "📚",
    recommended: true,
    keywords: ["citation", "cito", "reference", "cite"],
  },
  [TEMPLATE_URI.ANNOTATE_QUOTATION]: {
    name: "Annotate a paper quotation",
    description: "Annotating a paper quotation with personal interpretation",
    category: "Annotation",
    icon: "❝❞",
    recommended: true,
    keywords: ["comment", "annotation", "quote", "interpretation"],
  },
  [TEMPLATE_URI.COMMENT_PAPER]: {
    name: "Comment on Paper",
    description: "Add comments, quotes, or evaluations to papers",
    category: "Annotation",
    icon: "💬",
    recommended: true,
    keywords: ["comment", "annotation", "quote", "review"],
  },
  [TEMPLATE_URI.AIDA_SENTENCE]: {
    name: "AIDA Sentence",
    description: "Make structured scientific claims following the AIDA model",
    category: "Scientific",
    icon: "🔬",
    recommended: true,
    keywords: ["aida", "claim", "assertion", "scientific"],
  },
  [TEMPLATE_URI.GEO_COVERAGE]: {
    name: "Document geographical coverage",
    description:
      "Documents the geographical area or region covered by a research paper's findings, data, or study scope.",
    moreDescription:
      "Identify the spatial coverage (e.g. Europe, Canada, or a specific geographical area) and provide supporting quotations from the paper that led to this conclusion. The resulting nanopublication can work with GeoSPARQL queries for efficient spatial discovery of research.",
    category: "geographical coverage",
    icon: "📝",
    recommended: false,
    keywords: ["statement", "general", "rdf", "triple"],
  },

  // ── Data & Software ────────────────────────────────────────────────
  [TEMPLATE_URI.DATASET]: {
    name: "FAIR Dataset",
    description:
      "Describe a FAIR Digital Object dataset with metadata including creators, version, license, and access information.",
    category: "Data",
    icon: "📊",
    recommended: true,
    keywords: ["dataset", "data", "fair", "digital object", "zenodo"],
  },
  [TEMPLATE_URI.RESEARCH_SOFTWARE]: {
    name: "Research Software",
    description:
      "Describe research software with metadata including repository, supporting publications, and related resources.",
    category: "Software",
    icon: "💻",
    recommended: true,
    keywords: ["software", "code", "repository", "github", "tool"],
  },

  // ── PRISMA Systematic Review ───────────────────────────────────────
  [TEMPLATE_URI.PICO_RESEARCH_QUESTION]: {
    name: "PICO Research Question",
    description:
      "Define a research question using the PICO framework (Population, Intervention, Comparator, Outcome)",
    category: "Systematic Review",
    icon: "🔬",
    recommended: true,
    keywords: [
      "pico",
      "research",
      "question",
      "population",
      "intervention",
      "comparator",
      "outcome",
      "prisma",
      "systematic review",
    ],
  },
  [TEMPLATE_URI.PCC_RESEARCH_QUESTION]: {
    name: "PCC Research Question",
    description:
      "Define a review question using the PCC framework (Population, Concept, Context)",
    category: "Systematic Review",
    icon: "📋",
    recommended: true,
    keywords: [
      "pcc",
      "review",
      "question",
      "population",
      "concept",
      "context",
      "prisma",
      "systematic review",
    ],
  },
  [TEMPLATE_URI.PRISMA_SEARCH_STRATEGY]: {
    name: "PRISMA Search Strategy",
    description:
      "Document a systematic review search strategy following PRISMA 2020 guidelines.",
    moreDescription:
      "Captures search terms, databases, date ranges, languages, and methodology notes. Corresponds to PRISMA 2020 Item 7 (Search) for transparent, reproducible literature searches.",
    category: "Systematic Review",
    icon: "🔍",
    recommended: true,
    keywords: [
      "prisma",
      "systematic review",
      "search strategy",
      "literature",
      "meta-analysis",
    ],
  },
  [TEMPLATE_URI.PRISMA_DATABASE_SEARCH]: {
    name: "PRISMA Database Search",
    description:
      "Declare a systematic database search with query strings, filters, and result counts.",
    category: "Systematic Review",
    icon: "🗄️",
    recommended: false,
    keywords: [
      "prisma",
      "systematic review",
      "database",
      "search",
      "query",
    ],
  },
  [TEMPLATE_URI.PRISMA_SEARCH_EXECUTION_DATASET]: {
    name: "PRISMA Search Execution Dataset",
    description:
      "Declare a PRISMA search execution dataset aggregating search results across databases.",
    category: "Systematic Review",
    icon: "📑",
    recommended: false,
    keywords: [
      "prisma",
      "systematic review",
      "search execution",
      "dataset",
      "results",
    ],
  },
  [TEMPLATE_URI.PRISMA_STUDY_INCLUSION]: {
    name: "PRISMA Study Inclusion",
    description:
      "Declare a study to be included in a systematic review with rationale.",
    category: "Systematic Review",
    icon: "✅",
    recommended: false,
    keywords: [
      "prisma",
      "systematic review",
      "study",
      "inclusion",
      "selection",
    ],
  },
  [TEMPLATE_URI.PRISMA_STUDY_ASSESSMENT]: {
    name: "PRISMA Study Assessment",
    description:
      "Declare a PRISMA study assessment dataset with quality and bias evaluations.",
    category: "Systematic Review",
    icon: "📝",
    recommended: false,
    keywords: [
      "prisma",
      "systematic review",
      "study",
      "assessment",
      "quality",
      "bias",
    ],
  },
  [TEMPLATE_URI.PRISMA_FULL_SCREENING]: {
    name: "PRISMA Full Screening Selection",
    description:
      "Declare a study to be selected for full-text screening in a systematic review.",
    category: "Systematic Review",
    icon: "🔎",
    recommended: false,
    keywords: [
      "prisma",
      "systematic review",
      "screening",
      "full text",
      "selection",
    ],
  },

  // ── FORRT Replication ──────────────────────────────────────────────
  [TEMPLATE_URI.FORRT_CLAIM]: {
    name: "FORRT Claim",
    description:
      "Declare an original claim according to FORRT, linking it to an AIDA sentence with a specific FORRT type.",
    category: "Replication",
    icon: "🎓",
    recommended: true,
    keywords: ["forrt", "claim", "aida", "scientific", "replication"],
  },
  [TEMPLATE_URI.FORRT_REPLICATION]: {
    name: "FORRT Replication Study",
    description:
      "Declare a replication or reproduction study design according to FORRT, targeting a specific claim.",
    category: "Replication",
    icon: "🔁",
    recommended: true,
    keywords: [
      "forrt",
      "replication",
      "reproduction",
      "study",
      "claim",
      "scientific",
    ],
  },
  [TEMPLATE_URI.FORRT_REPLICATION_OUTCOME]: {
    name: "FORRT Replication Outcome",
    description:
      "Declare the outcome of a replication or reproduction study, including validation status, confidence, and conclusions.",
    category: "Replication",
    icon: "📊",
    recommended: true,
    keywords: [
      "forrt",
      "replication",
      "outcome",
      "validation",
      "reproduction",
      "result",
    ],
  },
};
