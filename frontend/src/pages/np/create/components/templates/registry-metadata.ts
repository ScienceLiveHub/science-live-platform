/**
 * Template metadata shared across all workspaces
 * This file contains no React imports and can be safely imported by non-React workspaces
 */

export interface NanopubTemplateMetadata {
  name: string;
  description: string;
  category: string;
  icon: string;
  recommended?: boolean;
  keywords?: string[];
}

/**
 * Template metadata without React components
 * Non-React workspaces (e.g., Zotero) should import this directly
 */
export const TEMPLATE_METADATA: Record<string, NanopubTemplateMetadata> = {
  "https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo": {
    name: "Citation with CiTO",
    description:
      "Declare citations between papers using Citation Typing Ontology",
    category: "Citation",
    icon: "📚",
    recommended: true,
    keywords: ["citation", "cito", "reference", "cite"],
  },
  "https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU": {
    name: "Annotate a paper quotation",
    description: "Annotating a paper quotation with personal interpretation",
    category: "Annotation",
    icon: "❝❞",
    recommended: true,
    keywords: ["comment", "annotation", "quote", "interpretation"],
  },
  "https://w3id.org/np/RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI": {
    name: "Comment on Paper",
    description: "Add comments, quotes, or evaluations to papers",
    category: "Annotation",
    icon: "💬",
    recommended: true,
    keywords: ["comment", "annotation", "quote", "review"],
  },
  "https://w3id.org/np/RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE": {
    name: "AIDA Sentence",
    description: "Make structured scientific claims following the AIDA model",
    category: "Scientific",
    icon: "🔬",
    recommended: true,
    keywords: ["aida", "claim", "assertion", "scientific"],
  },
  "https://w3id.org/np/RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao": {
    name: "Document geographical coverage",
    description:
      "Document the geographical area or region covered by a resercher paper, data, or study.",
    category: "geographical coverage",
    icon: "📝",
    recommended: false,
    keywords: ["statement", "general", "rdf", "triple"],
  },
};
