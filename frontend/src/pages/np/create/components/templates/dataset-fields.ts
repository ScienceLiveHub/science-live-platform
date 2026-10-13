import { validUriPlaceholder } from "@/lib/validation";
import { z } from "zod";

/**
 * Shape of the Dataset form.
 *
 * `creators` is required because the template says so: `st6` (dct:creator)
 * is the one repeatable statement declared without `nt:OptionalStatement`.
 * A dataset record with no attribution is the FAIR failure the template was
 * written to prevent, and it cannot be corrected after signing.
 */
export const datasetSchema = z.object({
  // Required fields
  fdo: validUriPlaceholder,
  label: z.string().min(3).max(300),
  description: z.string().min(10).max(2000),
  creators: z
    .array(z.string().url())
    .min(1, "Name at least one creator of the dataset"),
  // Optional fields
  contactEmail: z.string().email().optional().or(z.literal("")),
  version: z.string().optional().or(z.literal("")),
  language: z.string().optional().or(z.literal("")),
  domain: z.string().optional().or(z.literal("")),
  publisher: z.string().url().optional().or(z.literal("")),
  funder: z.string().url().optional().or(z.literal("")),
  project: z.string().optional().or(z.literal("")),
  fairProfile: z.string().optional().or(z.literal("")),
  contributors: z.array(z.string().url()).optional(),
});

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
