import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    // Use a browser environment for testing as this is more like the actual app
    environment: "jsdom",
  },
});
