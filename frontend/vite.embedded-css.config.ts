/**
 * A vite build specifically to build the app css so it can be embedded elsewhere (e.g. Zotero plugin)
 */
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: "dist-embedded-css",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "src/styles/index.css"),
      output: {
        assetFileNames: "sciencelive.css",
      },
    },
  },
});
