/**
 * Shared SPARQL files plugin for Vite and esbuild.
 * Handles .rq and .sparql file extensions.
 *
 * Parses placeholder comments in the format:
 *   # Placeholder: `?_name` — replaced with description (type: uri/literal/raw)
 *
 * The type is inferred from the description:
 *   - "URI:" → "uri"
 *   - "RAW:" → "raw"
 *   - Otherwise defaults to "literal"
 */

/**
 * Parse SPARQL content and extract placeholders with their types
 */
export function parseSparqlPlaceholders(
  code: string,
): Record<string, "uri" | "literal" | "raw"> {
  const placeholderRegex = /# Placeholder: `(\?\w+)`/g;
  const placeholders: Record<string, "uri" | "literal" | "raw"> = {};

  let match;
  while ((match = placeholderRegex.exec(code)) !== null) {
    const placeholderName = match[1].startsWith("?_")
      ? match[1].substring(2)
      : match[1];
    // Look at the rest of the line to infer type
    const lineStart = code.lastIndexOf("#", match.index);
    const lineEnd = code.indexOf("\n", match.index);
    const line = code.slice(lineStart, lineEnd);

    // Infer type from description
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes("uri:")) {
      placeholders[placeholderName] = "uri";
    } else if (lowerLine.includes("raw:")) {
      placeholders[placeholderName] = "raw";
    } else {
      placeholders[placeholderName] = "literal";
    }
  }

  return placeholders;
}

/**
 * Transform SPARQL file content into a JavaScript module
 */
export function transformSparqlFile(code: string): string {
  const placeholders = parseSparqlPlaceholders(code);

  // Create a SparqlQuery object with __placeholders
  const queryObj = {
    content: code,
    __placeholders: placeholders,
  };

  return `export default ${JSON.stringify(queryObj)};`;
}
