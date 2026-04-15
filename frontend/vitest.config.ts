import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    setupFiles: ["./__tests__/setup.ts"],
    testTimeout: 10_000,
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
