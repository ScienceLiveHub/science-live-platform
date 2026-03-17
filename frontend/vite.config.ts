import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

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
      sparqlFiles(),
      cloudflare({
        config(config) {
          if (mode === "development") {
            config.name = `${config.name}-dev`;
          }
          return config;
        },
      }),
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
