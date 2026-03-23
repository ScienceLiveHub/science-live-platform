/**
 * Esbuild plugin adapter for SPARQL files.
 * Uses the shared core transformation logic.
 */
import type { Plugin } from "esbuild";
import { transformSparqlFile } from "./core";

export function sparqlFilesPlugin(): Plugin {
  return {
    name: "sparql-files",
    setup(build) {
      build.onLoad({ filter: /\.(rq|sparql)$/ }, async (args) => {
        const fs = await import("fs");
        const code = await fs.promises.readFile(args.path, "utf8");

        return {
          contents: transformSparqlFile(code),
          loader: "js",
        };
      });
    },
  };
}
