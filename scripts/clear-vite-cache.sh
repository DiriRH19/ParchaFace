#!/usr/bin/env bash
set -euo pipefail

echo "Stopping dev-related node processes (ng, vite) if any..."
# try to stop only common dev servers (ng, vite). fallback: do not kill all node processes.
pkill -f "(ng|vite)" || true

echo "Listing caches to remove:"
ls -ld .angular/cache/*/ParchaFace/vite 2>/dev/null || true
ls -ld node_modules/.vite 2>/dev/null || true
ls -ld .vite 2>/dev/null || true

echo "Removing vite/angular caches..."
# remove safely (ignore errors)
rm -rf .angular/cache/*/ParchaFace/vite node_modules/.vite .vite || true

echo "Done."

