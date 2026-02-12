/**
 * React component registry
 * This file holds all React component mappings for template URIs
 */

import { ComponentType } from "react";
import AIDASentence from "./AIDASentence";
import AnnotateAPaperQuotation from "./AnnotateAPaperQuotation";
import CitationWithCiTO from "./CitationWithCiTO";
import CommentOnPaper from "./CommentOnPaper";
import DocumentGeographicalCoverage from "./DocumentGeographicalCoverage";
import { TEMPLATE_URI } from "./registry-metadata";

export interface NanopubTemplateDefComponentProps {
  publish: (data: Record<string, string | object>) => Promise<void>;
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
};
