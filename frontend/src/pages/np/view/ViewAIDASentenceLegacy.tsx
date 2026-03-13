/**
 * ViewAIDASentenceLegacy
 *
 * Legacy view component for nanopubs created with the old AIDA Sentence template.
 * This is a re-export of ViewAIDASentence — the view logic is the same,
 * but this file exists so legacy support is clearly separated and easy to remove.
 *
 * To remove legacy support: delete this file, its entry in view-registry.tsx,
 * and the corresponding URI in legacy-templates.ts.
 */

export { ViewAIDASentence as ViewAIDASentenceLegacy } from "./ViewAIDASentence";
