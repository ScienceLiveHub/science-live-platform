import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    hmr: {
      overlay: false,
    },
    // Add headers for WASM support
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  build: {
    target: 'esnext', // Required for top-level await in WASM
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
      '@nanopub/sign',
      '@sciencelivehub/nanopub-create'  // Add this
    ],
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@supabase/supabase-js',
      '@sciencelivehub/nanopub-view'
    ],
    // Force optimization even for large dependencies
    esbuildOptions: {
      target: 'esnext'
    }
  },
  worker: {
    format: 'es',
  },
  // Explicitly handle WASM and other binary files
  assetsInclude: ['**/*.wasm'],
});
