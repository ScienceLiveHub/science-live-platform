/**
 * React component registry
 * This file holds all React component mappings for template URIs
 */

import { ComponentType } from "react";
import AIDASentence from "./AIDASentence";
import AnnotateAPaperQuotation from "./AnnotateAPaperQuotation";
import CitationWithCiTO from "./CitationWithCiTO";
import CommentOnPaper from "./CommentOnPaper";
import Dataset from "./Dataset";
import DocumentGeographicalCoverage from "./DocumentGeographicalCoverage";
import ResearchSoftware from "./ResearchSoftware";
import { TEMPLATE_URI } from "./registry-metadata";

export interface NanopubTemplateDefComponentProps {
  submit: (data: Record<string, string | object>) => Promise<void>;
  prefilledData?: Record<string, string | object>;
}

/**
 * Maps template IDs to their React components
 * This file is only used by the frontend
 */
export const TEMPLATE_COMPONENTS: Record<
  string,
  ComponentType<NanopubTemplateDefComponentProps>
> = {
  [TEMPLATE_URI.CITATION_CITO]: CitationWithCiTO,
  [TEMPLATE_URI.ANNOTATE_QUOTATION]: AnnotateAPaperQuotation,
  [TEMPLATE_URI.COMMENT_PAPER]: CommentOnPaper,
  [TEMPLATE_URI.AIDA_SENTENCE]: AIDASentence,
  [TEMPLATE_URI.GEO_COVERAGE]: DocumentGeographicalCoverage,
  [TEMPLATE_URI.DATASET]: Dataset,
  [TEMPLATE_URI.RESEARCH_SOFTWARE]: ResearchSoftware,
};

export const NanopubEditorOptionFields = [
  {
    name: "isExampleNanopub",
    type: "checkbox",
    label: "Create Example Nanopub (for testing and demo purposes)",
    required: true,
    defaultValue: false,
    gridColumnSpan: 2,
    section: {
      title: "Options",
    },
  },
];
