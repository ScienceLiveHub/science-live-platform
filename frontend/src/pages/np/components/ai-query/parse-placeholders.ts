/**
 * Utility to parse SPARQL query placeholders.
 *
 * TODO: we have similar code elsewhere (parsing/running predefined queries in lib/queries)
 *       so ideally this should be refactored.
 *
 * Placeholders are denoted with `?_...` syntax.
 * If a URI is expected, the placeholder suffix is `_uri`.
 *
 * @see SYSTEMPROMPT.md for placeholder conventions.
 */

export interface ParsedPlaceholder {
  /** The full placeholder name including the ?_ prefix, e.g. ?_creator_uri */
  fullName: string;
  /** The placeholder name without prefix, e.g. _creator_uri */
  name: string;
  /** Whether this placeholder expects a URI value */
  isUri: boolean;
  /** A display label derived from the name, e.g. "Creator Uri" or "Search Term" */
  label: string;
}

/**
 * Parse a SPARQL query and extract all placeholders.
 *
 * Placeholders follow the pattern `?_identifier` where identifier:
 * - Starts with underscore and a letter
 * - May contain letters, numbers, and underscores
 * - May end with `_uri` to indicate a URI placeholder
 *
 * @param query - The SPARQL query string
 * @returns Array of parsed placeholders
 */
export function parsePlaceholders(query: string): ParsedPlaceholder[] {
  // Match ?_ followed by word characters (letters, numbers, underscores)
  // The placeholder name must start with a letter after _ to avoid matching regular variables
  const placeholderRegex = /\?(_[a-zA-Z][a-zA-Z0-9_]*)/g;

  const seen = new Set<string>();
  const placeholders: ParsedPlaceholder[] = [];

  let match: RegExpExecArray | null;
  while ((match = placeholderRegex.exec(query)) !== null) {
    const fullName = match[0]; // e.g., ?_creator_uri
    const name = match[1]; // e.g., _creator_uri

    // Skip duplicates
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);

    // Check if it's a URI placeholder (ends with _uri)
    const isUri = name.endsWith("_uri");

    // Generate a display label
    // Remove leading underscore and _uri suffix, then convert to title case
    let labelPart = name.slice(1); // Remove leading underscore
    if (isUri) {
      labelPart = labelPart.slice(0, -4); // Remove _uri suffix
    }
    const label = toTitleCase(labelPart);

    placeholders.push({
      fullName,
      name,
      isUri,
      label: isUri ? `${label} URI` : label,
    });
  }

  return placeholders;
}

/**
 * Convert a snake_case or camelCase string to Title Case.
 */
function toTitleCase(str: string): string {
  // Handle snake_case
  const words = str
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Handle camelCase
    .toLowerCase()
    .split(" ")
    .filter((w) => w.length > 0);

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Insert placeholder values into a SPARQL query.
 *
 * For URI placeholders, values are wrapped in angle brackets.
 * For literal placeholders, values are inserted as-is (typically as strings).
 *
 * @param query - The SPARQL query with placeholders
 * @param values - Map of placeholder names (without ?) to their values
 * @param placeholders - The parsed placeholders (for determining URI vs literal)
 * @returns The query with placeholders replaced
 */
export function insertPlaceholderValues(
  query: string,
  values: Record<string, string>,
  placeholders: ParsedPlaceholder[],
): string {
  let result = query;

  for (const placeholder of placeholders) {
    const value = values[placeholder.name];
    if (!value) continue;

    let replacement: string;
    if (placeholder.isUri) {
      // Wrap URI values in angle brackets
      // Ensure the value doesn't already have brackets
      const uri =
        value.startsWith("<") && value.endsWith(">") ? value : `<${value}>`;
      replacement = uri;
    } else {
      // For literal placeholders, insert the value as-is
      // Note: In a proper SPARQL query, literals should be quoted
      // but based on the SYSTEMPROMPT, placeholders are used in filters
      // where they're compared directly, so we insert the raw value
      replacement = `"${value}"`;
    }

    // Replace all occurrences of the placeholder
    result = result.replaceAll(placeholder.fullName, replacement);
  }

  return result;
}

/**
 * Validate a placeholder value.
 *
 * @param value - The value to validate
 * @param isUri - Whether this is a URI placeholder
 * @returns Error message if invalid, undefined if valid
 */
export function validatePlaceholderValue(
  value: string,
  isUri: boolean,
): string | undefined {
  if (!value.trim()) {
    return "This field is required";
  }

  if (isUri) {
    // Basic URI validation
    try {
      // Allow with or without angle brackets
      const uriToTest =
        value.startsWith("<") && value.endsWith(">")
          ? value.slice(1, -1)
          : value;
      new URL(uriToTest);
    } catch {
      return "Please enter a valid URI (e.g., https://orcid.org/0000-0000-0000-0000)";
    }
  }

  return undefined;
}
