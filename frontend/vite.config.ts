import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import path from "path";
import TOML from "smol-toml";
import { defineConfig, loadEnv } from "vite";

// Configure marked with GFM heading ID support for anchor links
marked.use(gfmHeadingId());

/**
 * Vite plugin to pre-compile markdown files to React components at build time.
 *
 * Usage:
 *   import PrivacyContent from '../../docs/policy/privacy.md';
 *
 *   export default function Policies() {
 *     return <PrivacyContent />
 *   };
 *
 * The imported module exports a React component by default.
 * Frontmatter (TOML between +++ delimiters) is extracted and exported as `frontmatter` named export.
 */
function markdownFiles() {
  return {
    name: "markdown-files",
    enforce: "pre" as const,
    async transform(code: string, id: string) {
      if (!id.endsWith(".md")) return null;

      // Parse frontmatter (TOML between +++ delimiters)
      let frontmatter: Record<string, unknown> = {};
      let content = code;

      const frontmatterMatch = code.match(
        /^\+\+\+\n([\s\S]*?)\n\+\+\+\n([\s\S]*)$/,
      );
      if (frontmatterMatch) {
        const frontmatterText = frontmatterMatch[1];
        content = frontmatterMatch[2];

        // Parse TOML frontmatter
        try {
          frontmatter = TOML.parse(frontmatterText) as Record<string, unknown>;
        } catch (e) {
          console.warn(`Failed to parse TOML frontmatter in ${id}:`, e);
        }
      }

      // Configure marked for GitHub Flavored Markdown
      const html = await marked.parse(content, {
        gfm: true,
        breaks: false,
      });

      // Generate React component code at build-time
      return `
import parse from 'html-react-parser';

export const frontmatter = ${JSON.stringify(frontmatter)};

export default function MarkdownContent() {
  return parse(${JSON.stringify(html)});
}
`;
    },
  };
}

/**
 * Vite plugin to import SPARQL query files as SparqlQuery objects.
 * Handles .sparql and .rq file extensions.
 *
 * Parses placeholder comments in the format:
 *   # Placeholder: `?_name` — replaced with description (type: uri/literal/raw)
 *
 * The type is inferred from the description:
 *   - "URI:" → "uri"
 *   - "RAW:" → "raw"
 *   - "string" → "literal"
 *   - Otherwise defaults to "literal"
 */
function sparqlFiles() {
  return {
    name: "sparql-files",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (id.endsWith(".sparql") || id.endsWith(".rq")) {
        // Parse placeholder comments
        // Format: # Placeholder: `?_name` — replaced with description
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

        // Create a SparqlQuery object with __placeholders
        const queryObj = {
          content: code,
          __placeholders: placeholders,
        };

        return `export default ${JSON.stringify(queryObj)};`;
      }
      return null;
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load all envs from file based on mode if applicable (.env, .env.production etc)
  // The third parameter "" means all envs will be available here, not just `VITE_*`
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      tailwindcss(),
      markdownFiles(),
      sparqlFiles(),
      cloudflare(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      strictPort: true,
      port: Number(env.PORT),
      hmr: {
        // TODO: I expected this to add an error overlay for all errors in dev
        // but it didn't always catch everything, so I rolled my own top level ErrorBoundary in addition to it
        overlay: true,
      },
      cors: true,
    },
    build: {
      chunkSizeWarningLimit: 3000,
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom"],
    },
  };
});
