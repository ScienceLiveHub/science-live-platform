/**
 * View Component Registry
 *
 * Maps template URIs to their custom view components.
 * When a nanopub is loaded, we detect which template it was created from
 * and render the appropriate custom view. If no custom view exists,
 * the generic NanopubViewer is used as a fallback.
 *
 * This registry includes both current and legacy template URIs to support
 * nanopubs created with older versions of templates.
 */

import { ComponentType } from "react";
import { CustomViewerProps } from "../create/components/NanopubViewer";
import {
  LEGACY_TEMPLATE_URIS,
  TEMPLATE_URI,
} from "../create/components/templates/registry-metadata";
import { ViewAIDASentence } from "./ViewAIDASentence";
import { ViewAnnotateQuotation } from "./ViewAnnotateQuotation";
import { ViewCitationWithCiTO } from "./ViewCitationWithCiTO";
import { ViewCommentOnPaper } from "./ViewCommentOnPaper";
import { ViewGeographicalCoverage } from "./ViewGeographicalCoverage";

/**
 * Registry mapping template URIs to their custom view components.
 * Includes both current and legacy template URIs.
 */
export const VIEW_COMPONENTS: Record<
  string,
  ComponentType<CustomViewerProps> | undefined
> = {
  // Current template URIs
  [TEMPLATE_URI.CITATION_CITO]: ViewCitationWithCiTO,
  [TEMPLATE_URI.ANNOTATE_QUOTATION]: ViewAnnotateQuotation,
  [TEMPLATE_URI.COMMENT_PAPER]: ViewCommentOnPaper,
  [TEMPLATE_URI.AIDA_SENTENCE]: ViewAIDASentence,
  [TEMPLATE_URI.GEO_COVERAGE]: ViewGeographicalCoverage,

  // Legacy AIDA_SENTENCE URIs
  ...(LEGACY_TEMPLATE_URIS.AIDA_SENTENCE?.reduce(
    (acc, uri) => ({ ...acc, [uri]: ViewAIDASentence }),
    {},
  ) ?? {}),
};
