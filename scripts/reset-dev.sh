#!/usr/bin/env bash
set -euo pipefail

sh ./scripts/clear-vite-cache.sh

echo "Installing dependencies if a lockfile exists..."
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
elif [ -f pnpm-lock.yaml ]; then
  pnpm install
elif [ -f yarn.lock ]; then
  yarn install --frozen-lockfile
else
  echo "No lockfile detected, skipping install (run your package manager if needed)."
fi

echo "Attempting to auto-fix lint warnings (if configured)..."
# Run ng lint --fix if available; don't fail the script if lint isn't set up
if command -v ng >/dev/null 2>&1; then
  ng lint --fix || true
fi

echo "Starting dev server via npm run start:clean. Use Ctrl+C to stop."
exec npm run start:clean
