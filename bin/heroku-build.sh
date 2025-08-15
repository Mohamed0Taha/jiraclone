#!/bin/bash
echo "=== Heroku Build Hook ==="
echo "NODE_ENV: $NODE_ENV"
echo "NPM_CONFIG_PRODUCTION: $NPM_CONFIG_PRODUCTION"

# Ensure we have dev dependencies for build
npm config set production false

# Build assets
echo "Building Vite assets..."
npm run build

echo "=== Build complete ==="
ls -la public/build/ || echo "No build directory found"
