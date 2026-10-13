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
export declare function parseSparqlPlaceholders(code: string): Record<string, "uri" | "literal" | "raw">;
/**
 * Transform SPARQL file content into a JavaScript module
 */
export declare function transformSparqlFile(code: string): string;
