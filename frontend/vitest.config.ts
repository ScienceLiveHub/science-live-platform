import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Generous timeouts because some template tests involve RSA signing and
    // WASM init, which is variable on CI runners.
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
