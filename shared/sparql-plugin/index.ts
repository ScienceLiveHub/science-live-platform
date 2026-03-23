/**
 * Shared SPARQL files plugin for Vite and esbuild.
 *
 * Usage:
 *
 * // For Vite (frontend):
 * import { sparqlFiles } from "../shared/sparql-plugin/vite";
 *
 * // For esbuild (zotero):
 * import { sparqlFilesPlugin } from "../shared/sparql-plugin/esbuild";
 */

export { parseSparqlPlaceholders, transformSparqlFile } from "./core";
export { sparqlFilesPlugin } from "./esbuild";
export { sparqlFiles } from "./vite";
