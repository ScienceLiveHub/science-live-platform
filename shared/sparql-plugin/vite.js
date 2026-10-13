/**
 * Vite plugin adapter for SPARQL files.
 * Uses the shared core transformation logic.
 */
import { transformSparqlFile } from "./core";
export function sparqlFiles() {
    return {
        name: "sparql-files",
        enforce: "pre",
        transform(code, id) {
            if (id.endsWith(".sparql") || id.endsWith(".rq")) {
                return transformSparqlFile(code);
            }
            return null;
        },
    };
}
