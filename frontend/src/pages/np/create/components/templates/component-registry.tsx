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
import FORRTClaim from "./FORRTClaim";
import FORRTKLReplication from "./FORRTKLReplication";
import FORRTKLReplicationOutcome from "./FORRTKLReplicationOutcome";
import FORRTReplication from "./FORRTReplication";
import FORRTReplicationOutcome from "./FORRTReplicationOutcome";
import PCCResearchQuestion from "./PCCResearchQuestion";
import PICOResearchQuestion from "./PICOResearchQuestion";
import PRISMADatabaseSearch from "./PRISMADatabaseSearch";
import PRISMAFullScreening from "./PRISMAFullScreening";
import PRISMASearchExecutionDataset from "./PRISMASearchExecutionDataset";
import PRISMASearchStrategy from "./PRISMASearchStrategy";
import PRISMAStudyAssessment from "./PRISMAStudyAssessment";
import PRISMAStudyInclusion from "./PRISMAStudyInclusion";
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
  [TEMPLATE_URI.PICO_RESEARCH_QUESTION]: PICOResearchQuestion,
  [TEMPLATE_URI.PCC_RESEARCH_QUESTION]: PCCResearchQuestion,
  [TEMPLATE_URI.RESEARCH_SOFTWARE]: ResearchSoftware,
  [TEMPLATE_URI.PRISMA_SEARCH_STRATEGY]: PRISMASearchStrategy,
  [TEMPLATE_URI.PRISMA_DATABASE_SEARCH]: PRISMADatabaseSearch,
  [TEMPLATE_URI.PRISMA_SEARCH_EXECUTION_DATASET]: PRISMASearchExecutionDataset,
  [TEMPLATE_URI.PRISMA_STUDY_INCLUSION]: PRISMAStudyInclusion,
  [TEMPLATE_URI.PRISMA_STUDY_ASSESSMENT]: PRISMAStudyAssessment,
  [TEMPLATE_URI.PRISMA_FULL_SCREENING]: PRISMAFullScreening,
  [TEMPLATE_URI.FORRT_REPLICATION_OUTCOME]: FORRTReplicationOutcome,
  [TEMPLATE_URI.FORRT_REPLICATION]: FORRTReplication,
  [TEMPLATE_URI.FORRT_CLAIM]: FORRTClaim,
  [TEMPLATE_URI.FORRT_KL_REPLICATION]: FORRTKLReplication,
  [TEMPLATE_URI.FORRT_KL_REPLICATION_OUTCOME]: FORRTKLReplicationOutcome,
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
