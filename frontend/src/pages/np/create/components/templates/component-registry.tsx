/**
 * React component registry - Frontend only
 * This file holds all React component mappings for templates
 */

import { ComponentType } from "react";
import AnnotateAPaperQuotation from "./AnnotateAPaperQuotation";

export interface NanopubTemplateDefComponentProps {
  publish: (data: any) => Promise<void>;
  prefilledData?: any;
}

/**
 * Maps template IDs to their React components
 * This file is only used by the frontend
 */
export const TEMPLATE_COMPONENTS: Record<
  string,
  ComponentType<NanopubTemplateDefComponentProps>
> = {
  // TODO: We have currently disabled most custom templates until they have been updated
  //       to support the latest functionality of the generic template UI

  // "https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo":
  //   CitationWithCiTO,
  "https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU":
    AnnotateAPaperQuotation,
  // "https://w3id.org/np/RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI":
  //   CommentOnPaper,
  // "https://w3id.org/np/RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE":
  //   AIDASentence,
  // "https://w3id.org/np/RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao":
  //   DocumentGeographicalCoverage,
};
