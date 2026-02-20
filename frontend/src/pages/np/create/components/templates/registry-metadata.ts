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

/** Nanopub hash portion of each known template URI */
export const TEMPLATE_URI = {
  CITATION_CITO:
    "https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo",
  ANNOTATE_QUOTATION:
    "https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU",
  COMMENT_PAPER:
    "http://purl.org/np/RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI",
  AIDA_SENTENCE:
    "https://w3id.org/np/RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE",
  GEO_COVERAGE:
    "https://w3id.org/np/RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao",
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
};
