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
    }
  },
  build: {
    target: 'esnext', // Required for top-level await in WASM
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
    exclude: ['@nanopub/sign'], // Don't pre-bundle WASM modules
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@supabase/supabase-js',
      '@sciencelivehub/nanopub-view'
    ],
  },
  worker: {
    format: 'es',
  },
});
