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

/** Nanopub hash portion of each known template URI (current/latest version used for creation) */
export const TEMPLATE_URI = {
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
  DATASET:
    "https://w3id.org/np/RAuVB37yyAuAlgusrUAoG84JI4_EfrEqIkpEZYDpSz3d8",
  RESEARCH_SOFTWARE:
    "https://w3id.org/np/RABBzVTxosLGT4YBCfdfNd6LyuOOTe2EVOTtWJMyOoZHk",
};

/**
 * Legacy/previous versions of template URIs.
 * Used for viewing nanopubs created with older template versions.
 * Maps template key to array of legacy URIs.
 */
export const LEGACY_TEMPLATE_URIS: Partial<Record<keyof typeof TEMPLATE_URI, string[]>> = {
  AIDA_SENTENCE: [
    "https://w3id.org/np/RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE",
  ],
};
/**
 * Template metadata without React components
 * Non-React workspaces (e.g., Zotero) should import this directly
 */
export const TEMPLATE_METADATA: Record<string, NanopubTemplateMetadata> = {
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
};
