#!/usr/bin/env bash
set -euo pipefail

echo "[heroku-build-node] Installing node deps... (local/helper script)" >&2
npm ci --include=dev

echo "[heroku-build-node] Building assets with Vite..." >&2
npm run build

echo "[heroku-build-node] Build complete. Contents of public/build:" >&2
ls -R public/build || true
