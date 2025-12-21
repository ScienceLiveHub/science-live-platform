"use client";
import { ComponentType } from "react";
import AIDASentence from "./AIDASentence";
import AnnotateAPaperQuotation from "./AnnotateAPaperQuotation";
import CitationWithCiTO from "./CitationWithCiTO";
import CommentOnPaper from "./CommentOnPaper";
import DocumentGeographicalCoverage from "./DocumentGeographicalCoverage";

/**
 * Validation regex helpers
 */
export const validLength = (min: number, max: number) =>
  new RegExp(`"[\s\S]{${min},${max}}"`);

export const validDoi = new RegExp("10.(\d)+/(\S)+");

export interface NanopubTemplateDefComponentProps {
  publish: (data: any) => Promise<void>;
}

/**
 * Definition for a pre-defined popular template
 */
export interface NanopubTemplateDef {
  name: string; // Display name
  description: string; // What this template is for
  category: string; // Category for grouping
  icon: string; // Emoji icon (optional)
  recommended?: boolean; // Show in main menu
  keywords?: string[]; // For search
  component?: ComponentType<NanopubTemplateDefComponentProps>;
}

/**
 * POPULAR TEMPLATES metadata
 * These appear in the main template selector
 */
export const POPULAR_TEMPLATES: Record<string, NanopubTemplateDef> = {
  "https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo": {
    name: "Citation with CiTO",
    description:
      "Declare citations between papers using Citation Typing Ontology",
    category: "Citation",
    icon: "📚",
    recommended: true,
    keywords: ["citation", "cito", "reference", "cite"],
    component: CitationWithCiTO,
  },
  "https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU": {
    name: "Annotate a paper quotation",
    description: "Annotating a paper quotation with personal interpretation",
    category: "Annotation",
    icon: "❝❞",
    recommended: true,
    keywords: ["comment", "annotation", "quote", "interpretation"],
    component: AnnotateAPaperQuotation,
  },
  "https://w3id.org/np/RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI": {
    name: "Comment on Paper",
    description: "Add comments, quotes, or evaluations to papers",
    category: "Annotation",
    icon: "💬",
    recommended: true,
    keywords: ["comment", "annotation", "quote", "review"],
    component: CommentOnPaper,
  },
  "https://w3id.org/np/RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE": {
    name: "AIDA Sentence",
    description: "Make structured scientific claims following the AIDA model",
    category: "Scientific",
    icon: "🔬",
    recommended: true,
    keywords: ["aida", "claim", "assertion", "scientific"],
    component: AIDASentence,
  },
  "https://w3id.org/np/RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao": {
    name: "Document geographical coverage",
    description:
      "Document the geographical area or region covered by a resercher paper, data, or study.",
    category: "geographical coverage",
    icon: "📝",
    recommended: false,
    keywords: ["statement", "general", "rdf", "triple"],
    component: DocumentGeographicalCoverage,
  },
};
