/** Human label for a constellation chain step, as shown in the story bibliography. */

/** "ResearchSoftware" -> "Research Software", "some_kind" -> "some kind". */
export const prettifyStepName = (s?: string) =>
  (s || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim();

/**
 * What to call a step in the bibliography.
 *
 * Spine steps have a name of their own ("Outcome", "CiTO"). An attached
 * nanopublication — a dataset, a geographical coverage, an access policy — is
 * whatever its own template says it is, so it names itself rather than showing
 * the useless "Attached". Templates often version their label ("(adjusted
 * version)"), which is noise to a reader, so that suffix is dropped.
 */
export function stepTypeLabel(step: { step: string; stepType?: string }): string {
  if (step.step !== "Attached") return prettifyStepName(step.step);
  const label = (step.stepType || "")
    .replace(/\s*\((?:adjusted|revised)[^)]*\)\s*$/i, "")
    .trim();
  return label || "Nanopublication";
}
