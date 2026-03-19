#!/usr/bin/env npx tsx
/**
 * Generate TypeScript declaration files for SPARQL query files (.rq).
 *
 * This script parses .rq files in src/lib/queries/ and generates corresponding
 * .rq.d.ts files with typed placeholder information based on comment annotations,
 * and output types based on the SELECT clause.
 *
 * Placeholder format in .rq files:
 *   # Placeholder: `?_placeholderName` - description
 *   # Placeholder: `?_placeholderName` - URI: description (for URI type)
 *   # Placeholder: `?_placeholderName` - RAW: description (for RAW type)
 *
 * Type inference:
 *   - If comment contains "URI:" → "uri" type
 *   - If comment contains "RAW:" → "raw" type
 *   - Otherwise → "literal" type
 *
 * Output types are extracted from the SELECT clause by parsing variable names.
 */

import * as fs from "fs";
import { glob } from "glob";
import * as path from "path";

const QUERIES_DIR = "src/lib/queries";

interface Placeholder {
  name: string;
  type: "uri" | "literal" | "raw";
}

interface OutputVariable {
  name: string;
}

/**
 * Parse a SPARQL query file and extract placeholder information from comments
 * and output variables from the SELECT clause.
 */
function parseQueryFile(content: string): {
  description: string;
  placeholders: Placeholder[];
  outputs: OutputVariable[];
} {
  const lines = content.split("\n");
  const descriptionLines: string[] = [];
  const placeholders: Placeholder[] = [];
  let endedDescription = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Extract description from leading comment lines
    if (
      trimmed.startsWith("#") &&
      !trimmed.includes("Placeholder:") &&
      !endedDescription
    ) {
      const commentText = trimmed.slice(1).trim();
      // Skip prefix declarations in comments
      if (!commentText.startsWith("prefix ") && commentText.length > 0) {
        descriptionLines.push(commentText);
      }
    } else {
      endedDescription = true;
    }

    // Parse placeholder annotations
    if (trimmed.startsWith("#") && trimmed.includes("Placeholder:")) {
      const placeholderMatch = trimmed.match(
        /Placeholder:\s*`?\?_([^`:\s]+)`?\s*[-—:]\s*(.*)/i,
      );
      if (placeholderMatch) {
        const name = placeholderMatch[1];
        const description = placeholderMatch[2].trim();

        // Determine type based on description content
        let type: "uri" | "literal" | "raw" = "literal";
        if (description.toUpperCase().includes("URI:")) {
          type = "uri";
        } else if (description.toUpperCase().includes("RAW:")) {
          type = "raw";
        }

        placeholders.push({ name, type });
      }
    }
  }

  // Extract outputs from SELECT clause
  const outputs = parseSelectOutputs(content);

  return {
    description: descriptionLines.join(" ").trim() || "SPARQL query",
    placeholders,
    outputs,
  };
}

/**
 * Parse the SELECT clause of a SPARQL query to extract output variable names.
 * Handles:
 * - Simple variables: ?var
 * - Expressions with aliases: (expr AS ?var) or (expr as ?var)
 * - Aggregate functions: (count(?x) as ?count)
 * - DISTINCT modifier
 */
function parseSelectOutputs(content: string): OutputVariable[] {
  const outputs: OutputVariable[] = [];

  // Normalize whitespace and find SELECT clause
  // Handle multi-line SELECT clauses
  const normalizedContent = content.replace(/\s+/g, " ");

  // Match SELECT clause - handles SELECT, SELECT DISTINCT, etc.
  // Captures everything between SELECT and WHERE (case insensitive)
  const selectMatch = normalizedContent.match(
    /select\s+(distinct\s+)?(.*?)\s+where/i,
  );

  if (!selectMatch) {
    return outputs;
  }

  const selectClause = selectMatch[2].trim();

  // Handle SELECT * - we can't determine outputs statically
  if (selectClause === "*") {
    return outputs;
  }

  // Parse variables and expressions
  // Pattern for simple variables: ?varName
  const simpleVarPattern = /\?([a-zA-Z_][a-zA-Z0-9_]*)/g;

  // Pattern for expressions with AS alias: ( ... AS ?varName )
  const aliasPattern = /\(\s*.*?\s+as\s+\?([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/gi;

  // First, find all aliased expressions (these take precedence)
  let aliasMatch;
  const aliasedVars = new Set<string>();
  while ((aliasMatch = aliasPattern.exec(selectClause)) !== null) {
    aliasedVars.add(aliasMatch[1]);
    outputs.push({ name: aliasMatch[1] });
  }

  // Remove aliased expressions from the clause to find remaining simple variables
  const withoutAliases = selectClause.replace(aliasPattern, "");

  // Find simple variables that are not placeholders (don't start with _)
  let varMatch;
  while ((varMatch = simpleVarPattern.exec(withoutAliases)) !== null) {
    const varName = varMatch[1];
    // Skip placeholders (they start with underscore) and already-added aliases
    if (!varName.startsWith("_") && !aliasedVars.has(varName)) {
      outputs.push({ name: varName });
    }
  }

  return outputs;
}

/**
 * Generate TypeScript declaration content for a query file.
 */
function generateDeclaration(
  queryFileName: string,
  description: string,
  placeholders: Placeholder[],
  outputs: OutputVariable[],
): string {
  const baseName = path.basename(queryFileName, ".rq");

  // Build the placeholder type object
  const placeholderType =
    placeholders.length > 0
      ? `{\n${placeholders.map((p) => `  ${p.name}: "${p.type}";`).join("\n")}\n}`
      : "Record<string, never>";

  // Build the output type object
  const outputType =
    outputs.length > 0
      ? `{\n${outputs.map((o) => `  ${o.name}: "string";`).join("\n")}\n}`
      : "Record<string, never>";

  // Generate the description, capitalizing first letter
  const capitalizedDescription =
    description.charAt(0).toUpperCase() + description.slice(1);

  return `/**
 * ${capitalizedDescription}
 * @see ./${baseName}.rq
 * @generator Generated by \`npm run generate:query-types\`
 */
declare const query: import("../sparql").SparqlQuery<${placeholderType}, ${outputType}>;
export default query;
`;
}

/**
 * Convert a kebab-case filename (without extension) to UPPER_SNAKE_CASE.
 * e.g. "search-nanopubs-by-type" → "SEARCH_NANOPUBS_BY_TYPE"
 */
function toExportName(filename: string): string {
  return filename.replace(/-/g, "_").toUpperCase();
}

/**
 * Generate the barrel index.ts file that re-exports all .rq files.
 */
function generateBarrelFile(queryFiles: string[]): string {
  const exports = queryFiles
    .map((f) => path.basename(f, ".rq"))
    .sort()
    .map(
      (baseName) =>
        `export { default as ${toExportName(baseName)} } from "./${baseName}.rq";`,
    );

  return `/**
 * Barrel export for all SPARQL query files.
 *
 * @generator Generated by \`npm run generate:query-types\`
 */

${exports.join("\n")}
`;
}

/**
 * Main function to generate all declaration files.
 */
async function main() {
  console.log("Generating SPARQL query type declarations...\n");

  // Find all .rq files
  const pattern = path.join(QUERIES_DIR, "*.rq").replace(/\\/g, "/");
  const queryFiles = await glob(pattern);

  if (queryFiles.length === 0) {
    console.log("No .rq files found in", QUERIES_DIR);
    return;
  }

  let generated = 0;
  let skipped = 0;

  for (const queryFile of queryFiles) {
    const declarationFile = `${queryFile}.d.ts`;
    // const relativeQueryFile = path.relative(process.cwd(), queryFile);
    const relativeDeclFile = path.relative(process.cwd(), declarationFile);

    // Read and parse the query file
    const content = fs.readFileSync(queryFile, "utf-8");
    const { description, placeholders, outputs } = parseQueryFile(content);

    // Generate declaration content
    const declaration = generateDeclaration(
      queryFile,
      description,
      placeholders,
      outputs,
    );

    // Check if file exists and has same content
    if (fs.existsSync(declarationFile)) {
      const existing = fs.readFileSync(declarationFile, "utf-8");
      if (existing === declaration) {
        console.log(`  [skip] ${relativeDeclFile} (up to date)`);
        skipped++;
        continue;
      }
    }

    // Write the declaration file
    fs.writeFileSync(declarationFile, declaration, "utf-8");
    console.log(`  [gen]  ${relativeDeclFile}`);
    if (placeholders.length > 0) {
      console.log(
        `         Placeholders: ${placeholders.map((p) => `${p.name}: ${p.type}`).join(", ")}`,
      );
    }
    if (outputs.length > 0) {
      console.log(`         Outputs: ${outputs.map((o) => o.name).join(", ")}`);
    }
    generated++;
  }

  console.log(`\nDone! Generated: ${generated}, Skipped: ${skipped}`);

  // Generate barrel index.ts
  const barrelFile = path.join(QUERIES_DIR, "index.ts");
  const relativeBarrelFile = path.relative(process.cwd(), barrelFile);
  const barrelContent = generateBarrelFile(queryFiles);

  if (fs.existsSync(barrelFile)) {
    const existing = fs.readFileSync(barrelFile, "utf-8");
    if (existing === barrelContent) {
      console.log(`\n  [skip] ${relativeBarrelFile} (up to date)`);
    } else {
      fs.writeFileSync(barrelFile, barrelContent, "utf-8");
      console.log(`\n  [gen]  ${relativeBarrelFile}`);
    }
  } else {
    fs.writeFileSync(barrelFile, barrelContent, "utf-8");
    console.log(`\n  [gen]  ${relativeBarrelFile}`);
  }
}

main().catch((err) => {
  console.error("Error generating query types:", err);
  process.exit(1);
});
