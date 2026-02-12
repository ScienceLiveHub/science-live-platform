/**
 * View Component Registry
 *
 * Maps template URIs to their custom view components.
 * When a nanopub is loaded, we detect which template it was created from
 * and render the appropriate custom view. If no custom view exists,
 * the generic NanopubViewer is used as a fallback.
 */

import { NanopubStore } from "@/lib/nanopub-store";
import { ComponentType } from "react";
import { TEMPLATE_URI } from "../create/components/templates/registry-metadata";
import { ViewAIDASentence } from "./ViewAIDASentence";
import { ViewAnnotateQuotation } from "./ViewAnnotateQuotation";
import { ViewCitationWithCiTO } from "./ViewCitationWithCiTO";
import { ViewCommentOnPaper } from "./ViewCommentOnPaper";
import { ViewGeographicalCoverage } from "./ViewGeographicalCoverage";

export interface NanopubViewComponentProps {
  store: NanopubStore;
  creatorUserIdsByOrcid?: Record<string, string | null>;
}

/**
 * Registry mapping template URIs to their custom view components.
 */
export const VIEW_COMPONENTS: Record<
  string,
  ComponentType<NanopubViewComponentProps>
> = {
  [TEMPLATE_URI.CITATION_CITO]: ViewCitationWithCiTO,
  [TEMPLATE_URI.ANNOTATE_QUOTATION]: ViewAnnotateQuotation,
  [TEMPLATE_URI.COMMENT_PAPER]: ViewCommentOnPaper,
  [TEMPLATE_URI.AIDA_SENTENCE]: ViewAIDASentence,
  [TEMPLATE_URI.GEO_COVERAGE]: ViewGeographicalCoverage,
};
