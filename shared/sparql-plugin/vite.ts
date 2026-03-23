/**
 * Vite plugin adapter for SPARQL files.
 * Uses the shared core transformation logic.
 */
import { transformSparqlFile } from "./core";

export function sparqlFiles() {
  return {
    name: "sparql-files",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (id.endsWith(".sparql") || id.endsWith(".rq")) {
        return transformSparqlFile(code);
      }
      return null;
    },
  };
}
