import path from "path";
import { defineConfig } from "vitest/config";
import { sparqlFiles } from "../shared/sparql-plugin/vite";

export default defineConfig({
  plugins: [sparqlFiles()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    setupFiles: ["./__tests__/setup.ts"],
    // Generous timeouts because some template tests involve RSA signing,
    // which is variable on CI runners.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    /* Uncomment to enable headless browser-based testing */
    //   browser: {
    //     provider: playwright(),
    //     enabled: true,
    //     headless: true,
    //     // at least one instance is required
    //     instances: [{ browser: "chromium" }],
    //   },
  },
});
