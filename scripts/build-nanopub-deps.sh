#!/bin/bash
set -e

echo "🔨 Building nanopub dependencies..."

# Build nanopub-view
echo ""
echo "📦 Building @sciencelivehub/nanopub-view..."
cd node_modules/@sciencelivehub/nanopub-view

if [ ! -f "package.json" ]; then
  echo "❌ nanopub-view not found. Run 'npm install' first."
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing nanopub-view dependencies..."
  npm install
fi

# Create library-specific vite config if it doesn't exist
if [ ! -f "vite.lib.config.js" ]; then
  echo "Creating vite.lib.config.js..."
  cat > vite.lib.config.js << 'VITE_EOF'
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'NanopubViewer',
      formats: ['es', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'nanopub-viewer.esm.js';
        if (format === 'umd') return 'nanopub-viewer.js';
      }
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'nanopub-viewer.css';
          return assetInfo.name;
        }
      }
    }
  }
});
VITE_EOF
fi

# Build the library using the lib config
echo "Building library..."
npx vite build --config vite.lib.config.js

if [ -d "dist" ]; then
  echo "✅ nanopub-view built successfully"
  ls -lh dist/
else
  echo "❌ nanopub-view build failed - no dist directory"
  exit 1
fi

cd ../../..

# Build nanopub-create
echo ""
echo "📦 Building @sciencelivehub/nanopub-create..."
cd node_modules/@sciencelivehub/nanopub-create

if [ ! -f "package.json" ]; then
  echo "❌ nanopub-create not found. Run 'npm install' first."
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing nanopub-create dependencies..."
  npm install
fi

# Build the library (it already has vite.lib.config.js)
echo "Building library..."
npx vite build --config vite.lib.config.js

if [ -d "dist" ]; then
  echo "✅ nanopub-create built successfully"
  ls -lh dist/
else
  echo "❌ nanopub-create build failed - no dist directory"
  exit 1
fi

cd ../../..

echo ""
echo "✅ All nanopub dependencies built successfully!"
echo ""
echo "Available files:"
echo "  📦 nanopub-view:"
ls -lh node_modules/@sciencelivehub/nanopub-view/dist/ 2>/dev/null || echo "     (no dist files)"
echo ""
echo "  📦 nanopub-create:"
ls -lh node_modules/@sciencelivehub/nanopub-create/dist/ 2>/dev/null || echo "     (no dist files)"
