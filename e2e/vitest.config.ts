import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = dirname(fileURLToPath(import.meta.url));

// E2E tests for the Science Live Platform. These drive a real browser against a
// deployed (or local) instance — see e2e/README.md. Run with:  npm run test:e2e
export default defineConfig({
  test: {
    // Keep test discovery scoped to the e2e/ folder regardless of cwd, so this
    // config never picks up the frontend/api unit tests.
    root: here,
    include: ["**/*.test.ts"],
    // Each test drives a real browser against a live server with network waits
    // (and RSA signing in the create flow), so allow plenty of time.
    testTimeout: 180_000,
    hookTimeout: 180_000,
    // Run files one at a time: they each launch a browser and share the same
    // target instance, and sequential runs give clearer manual output.
    fileParallelism: false,
  },
});
