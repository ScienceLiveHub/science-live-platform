import { transformSparqlFile } from "./core";
export function sparqlFilesPlugin() {
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
