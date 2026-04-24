/**
 * View Component Registry
 *
 * Maps template URIs to their custom view components.
 * When a nanopub is loaded, we detect which template it was created from
 * and render the appropriate custom view. If no custom view exists,
 * the generic NanopubViewer is used as a fallback.
 */

import {
  BookCheck,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Code2,
  Database,
  FileSpreadsheet,
  FlaskConical,
  Globe,
  GraduationCap,
  MessageSquare,
  Microscope,
  Quote,
  ScanSearch,
  SearchCheck,
  type LucideIcon,
} from "lucide-react";
import { ComponentType } from "react";
import {
  LEGACY_TEMPLATE_URIS,
  TEMPLATE_URI,
} from "../create/components/templates/registry-metadata";
import { CustomViewerProps } from "./NanopubViewer";
import { ViewAIDASentence } from "./ViewAIDASentence";
import { ViewAIDASentenceLegacy } from "./ViewAIDASentenceLegacy";
import { ViewAnnotateQuotation } from "./ViewAnnotateQuotation";
import { ViewCitationWithCiTO } from "./ViewCitationWithCiTO";
import { ViewCommentOnPaper } from "./ViewCommentOnPaper";
import { ViewDataset } from "./ViewDataset";
import { ViewFORRTClaim } from "./ViewFORRTClaim";
import { ViewFORRTKLReplication } from "./ViewFORRTKLReplication";
import { ViewFORRTKLReplicationOutcome } from "./ViewFORRTKLReplicationOutcome";
import { ViewFORRTReplication } from "./ViewFORRTReplication";
import { ViewFORRTReplicationOutcome } from "./ViewFORRTReplicationOutcome";
import { ViewGeographicalCoverage } from "./ViewGeographicalCoverage";
import { ViewODRLAccessGrant } from "./ViewODRLAccessGrant";
import { ViewODRLPolicy } from "./ViewODRLPolicy";
import { ViewPCCResearchQuestion } from "./ViewPCCResearchQuestion";
import { ViewPICOResearchQuestion } from "./ViewPICOResearchQuestion";
import { ViewPICOResearchQuestionLegacy } from "./ViewPICOResearchQuestionLegacy";
import { ViewPRISMADatabaseSearch } from "./ViewPRISMADatabaseSearch";
import { ViewPRISMAFullScreening } from "./ViewPRISMAFullScreening";
import { ViewPRISMASearchExecutionDataset } from "./ViewPRISMASearchExecutionDataset";
import { ViewPRISMASearchStrategy } from "./ViewPRISMASearchStrategy";
import { ViewPRISMAStudyAssessment } from "./ViewPRISMAStudyAssessment";
import { ViewPRISMAStudyInclusion } from "./ViewPRISMAStudyInclusion";
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
  [TEMPLATE_URI.DATASET]: ViewDataset,
  [TEMPLATE_URI.ODRL_POLICY]: ViewODRLPolicy,
  [TEMPLATE_URI.ODRL_ACCESS_GRANT]: ViewODRLAccessGrant,
  [TEMPLATE_URI.PICO_RESEARCH_QUESTION]: ViewPICOResearchQuestion,
  [TEMPLATE_URI.PCC_RESEARCH_QUESTION]: ViewPCCResearchQuestion,
  [TEMPLATE_URI.RESEARCH_SOFTWARE]: ViewResearchSoftware,
  [TEMPLATE_URI.PRISMA_SEARCH_STRATEGY]: ViewPRISMASearchStrategy,
  [TEMPLATE_URI.PRISMA_DATABASE_SEARCH]: ViewPRISMADatabaseSearch,
  [TEMPLATE_URI.PRISMA_SEARCH_EXECUTION_DATASET]:
    ViewPRISMASearchExecutionDataset,
  [TEMPLATE_URI.PRISMA_STUDY_INCLUSION]: ViewPRISMAStudyInclusion,
  [TEMPLATE_URI.PRISMA_STUDY_ASSESSMENT]: ViewPRISMAStudyAssessment,
  [TEMPLATE_URI.PRISMA_FULL_SCREENING]: ViewPRISMAFullScreening,
  [TEMPLATE_URI.FORRT_REPLICATION_OUTCOME]: ViewFORRTReplicationOutcome,
  [TEMPLATE_URI.FORRT_REPLICATION]: ViewFORRTReplication,
  [TEMPLATE_URI.FORRT_CLAIM]: ViewFORRTClaim,
  [TEMPLATE_URI.FORRT_KL_REPLICATION]: ViewFORRTKLReplication,
  [TEMPLATE_URI.FORRT_KL_REPLICATION_OUTCOME]: ViewFORRTKLReplicationOutcome,
  // Legacy templates — remove when no longer needed
  [LEGACY_TEMPLATE_URIS.FORRT_CLAIM![0]]: ViewFORRTClaim,
  [LEGACY_TEMPLATE_URIS.PICO_RESEARCH_QUESTION![0]]:
    ViewPICOResearchQuestionLegacy,
  [LEGACY_TEMPLATE_URIS.AIDA_SENTENCE![0]]: ViewAIDASentenceLegacy,
  [LEGACY_TEMPLATE_URIS.CITATION_CITO![0]]: ViewCitationWithCiTO,
};

/**
 * Maps template IDs to their icons
 */
export const TEMPLATE_VIEW_ICONS: Record<string, LucideIcon> = {
  [TEMPLATE_URI.CITATION_CITO]: BookOpen,
  [TEMPLATE_URI.ANNOTATE_QUOTATION]: Quote,
  [TEMPLATE_URI.COMMENT_PAPER]: MessageSquare,
  [TEMPLATE_URI.AIDA_SENTENCE]: FlaskConical,
  [TEMPLATE_URI.GEO_COVERAGE]: Globe,
  [TEMPLATE_URI.DATASET]: Database,
  [TEMPLATE_URI.PICO_RESEARCH_QUESTION]: Microscope,
  [TEMPLATE_URI.PCC_RESEARCH_QUESTION]: ClipboardList,
  [TEMPLATE_URI.RESEARCH_SOFTWARE]: Code2,
  [TEMPLATE_URI.PRISMA_SEARCH_STRATEGY]: SearchCheck,
  [TEMPLATE_URI.PRISMA_DATABASE_SEARCH]: Database,
  [TEMPLATE_URI.PRISMA_SEARCH_EXECUTION_DATASET]: FileSpreadsheet,
  [TEMPLATE_URI.PRISMA_STUDY_INCLUSION]: BookCheck,
  [TEMPLATE_URI.PRISMA_STUDY_ASSESSMENT]: ClipboardCheck,
  [TEMPLATE_URI.PRISMA_FULL_SCREENING]: ScanSearch,
  [TEMPLATE_URI.FORRT_REPLICATION_OUTCOME]: ClipboardCheck,
  [TEMPLATE_URI.FORRT_REPLICATION]: FlaskConical,
  [TEMPLATE_URI.FORRT_CLAIM]: GraduationCap,
  [TEMPLATE_URI.FORRT_KL_REPLICATION]: FlaskConical,
  [TEMPLATE_URI.FORRT_KL_REPLICATION_OUTCOME]: ClipboardCheck,
};
