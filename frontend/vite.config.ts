import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Load all envs from file based on mode if applicable (.env, .env.production etc)
  // The third parameter "" means all envs will be available here, not just `VITE_*`
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss(), cloudflare()],
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
      target: "esnext", // Required for top-level await in WASM
      // Increase chunk size limit for large WASM files
      chunkSizeWarningLimit: 5000,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    optimizeDeps: {
      // Don't pre-bundle WASM modules
      exclude: ["nanopub-js"],
      include: ["react", "react-dom", "react-router-dom"],
      // Force optimization even for large dependencies
      esbuildOptions: {
        target: "esnext",
      },
    },
  };
});
