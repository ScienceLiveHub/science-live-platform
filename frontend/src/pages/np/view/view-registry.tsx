/**
 * View Component Registry
 *
 * Maps template URIs to their custom view components.
 * When a nanopub is loaded, we detect which template it was created from
 * and render the appropriate custom view. If no custom view exists,
 * the generic NanopubViewer is used as a fallback.
 */

import { ComponentType } from "react";
import { CustomViewerProps } from "../create/components/NanopubViewer";
import {
  LEGACY_TEMPLATE_URIS,
  TEMPLATE_URI,
} from "../create/components/templates/registry-metadata";
import { ViewAIDASentence } from "./ViewAIDASentence";
import { ViewAIDASentenceLegacy } from "./ViewAIDASentenceLegacy";
import { ViewAnnotateQuotation } from "./ViewAnnotateQuotation";
import { ViewCitationWithCiTO } from "./ViewCitationWithCiTO";
import { ViewCommentOnPaper } from "./ViewCommentOnPaper";
import { ViewGeographicalCoverage } from "./ViewGeographicalCoverage";
import { ViewResearchSoftware } from "./ViewResearchSoftware";

/**
 * Registry mapping template URIs to their custom view components.
 */
export const VIEW_COMPONENTS: Record<
  string,
  ComponentType<CustomViewerProps> | undefined
> = {
  [TEMPLATE_URI.CITATION_CITO]: ViewCitationWithCiTO,
  [TEMPLATE_URI.ANNOTATE_QUOTATION]: ViewAnnotateQuotation,
  [TEMPLATE_URI.COMMENT_PAPER]: ViewCommentOnPaper,
  [TEMPLATE_URI.AIDA_SENTENCE]: ViewAIDASentence,
  [TEMPLATE_URI.GEO_COVERAGE]: ViewGeographicalCoverage,
  [TEMPLATE_URI.RESEARCH_SOFTWARE]: ViewResearchSoftware,
  // Legacy templates — remove when no longer needed
  [LEGACY_TEMPLATE_URIS.AIDA_SENTENCE![0]]: ViewAIDASentenceLegacy,
};
