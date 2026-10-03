/**
 * Translate this form's field names into the names the Dataset template
 * actually declares.
 *
 * The form reads better with `creators`, `contributors`, `contactEmail` and
 * `fairProfile`, but the template's placeholders are `creator`, `contributor`,
 * `contact` and `fip`, and its repeatable statements are keyed by statement id
 * (`st6` creator, `st7` contributor) with one object per row — the same shape
 * the CiTO form uses for `st02`.
 *
 * Without this mapping the generator sees no value for those placeholders and,
 * because `st6` and `st8` are not optional, emits the placeholder node itself
 * as the object: a published record whose creator is
 * `<…/RAuVB37yy…/creator>` — a form field, not a person. Everything the user
 * typed into those four inputs was discarded.
 */
export function toTemplateValues(
  value: Record<string, unknown>,
): Record<string, string | object> {
  const {
    creators,
    contributors,
    contactEmail,
    fairProfile,
    ...rest
  } = value as {
    creators?: string[];
    contributors?: string[];
    contactEmail?: string;
    fairProfile?: string;
  } & Record<string, unknown>;

  const out: Record<string, string | object> = {
    ...(rest as Record<string, string | object>),
  };
  const rows = (uris: string[] | undefined, key: string) =>
    (uris ?? []).filter((u) => u?.trim()).map((u) => ({ [key]: u.trim() }));

  const creatorRows = rows(creators, "creator");
  if (creatorRows.length) out.st6 = creatorRows;
  const contributorRows = rows(contributors, "contributor");
  if (contributorRows.length) out.st7 = contributorRows;
  if (contactEmail?.trim()) out.contact = contactEmail.trim();
  if (fairProfile?.trim()) out.fip = fairProfile.trim();

  return out;
}
