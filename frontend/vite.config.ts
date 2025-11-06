import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // Load all envs from file based on mode if applicable (.env, .env.production etc)
  // The third parameter "" means all envs will be available here, not just `VITE_*`
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      strictPort: true,
      port: Number(env.PORT),
      hmr: {
        overlay: false,
      },
      // Add headers for WASM support
      headers: {
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cross-Origin-Opener-Policy": "same-origin",
      },
      cors: true,
    },
    build: {
      target: "esnext", // Required for top-level await in WASM
      // Increase chunk size limit for large WASM files
      chunkSizeWarningLimit: 5000,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    optimizeDeps: {
      // Don't pre-bundle WASM modules
      exclude: [
        "@nanopub/sign",
        "@sciencelivehub/nanopub-create", // Add this
      ],
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@sciencelivehub/nanopub-view",
      ],
      // Force optimization even for large dependencies
      esbuildOptions: {
        target: "esnext",
      },
    },
    worker: {
      format: "es",
    },
    // Explicitly handle WASM and other binary files
    assetsInclude: ["**/*.wasm"],
  };
});
