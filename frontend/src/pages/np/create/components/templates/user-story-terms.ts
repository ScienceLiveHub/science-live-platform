/**
 * Vocabulary shared by the User Story form and view.
 */

/** The fixed domain list the template restricts `sub:domain` to */
export const USER_STORY_DOMAIN_OPTIONS =
  "https://w3id.org/np/RACXDZHEowTYDAzZvdmD0qIGpXZwY5ghMRBBlt6N8Iu5s";

/**
 * Nanopub types of the terms the template's guided choices offer. The template searches
 * `find-things?type=…`, a whole-word text search (typing "wild" does not find
 * "Wildfires"); the vocabularies are short, so the form offers every live term instead.
 */
export const USER_STORY_TERM_TYPES = {
  challenge: "https://w3id.org/fff/Challenge",
  exposed: "https://w3id.org/fff/Exposed-Entity",
  digitalObject: "https://w3id.org/fair/fip/terms/Digital-Object-Type",
} as const;

/**
 * Namespaces user stories are written in. The template (RACciFqZ…) uses `fff:`, while
 * the user stories already on the network (made with the FIP wizard) use `fff/req/`.
 * The view reads both.
 */
export const USER_STORY_NAMESPACES = [
  "https://w3id.org/fff/",
  "https://w3id.org/fff/req/",
];

export const DECLARED_FOR_DIGITAL_OBJECT_TYPE =
  "https://w3id.org/fair/fip/terms/declared-for-digital-object-type";

/**
 * The short name a story is minted under, made from its title when none is given:
 * letters, digits and dashes, e.g. "F2A CS2 US4" → "F2A-CS2-US4". The same rule as
 * np-user-story-service's `localName`, so a story gets the same name either way.
 */
export function shortNameFrom(title: string): string {
  return (
    String(title)
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "user-story"
  );
}
