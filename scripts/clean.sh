#!/bin/bash
# clean.sh - Cleanup build artifacts, dependencies, and temporary files in the repository.

set -e

# Resolve project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "Cleaning up repository artifacts..."

# Remove Node dependencies & builds
echo "Removing node_modules & dist..."
rm -rf node_modules
rm -rf desktop-app/node_modules
rm -rf desktop-app/dist
rm -rf desktop-app/dist-ssr

# Remove Tauri build targets & resources
echo "Removing Tauri targets, schemas, & resources..."
rm -rf desktop-app/src-tauri/target
rm -rf desktop-app/src-tauri/gen/schemas
rm -rf desktop-app/src-tauri/resources

# Remove Go binaries & caches
echo "Removing compiled Go binaries..."
rm -rf backend/bin
rm -f backend/justsent-backend*
rm -f backend/cloudflared*
rm -f scripts/justsent-backend*
rm -f scripts/cloudflared*

# Remove Logs & temporary files
echo "Removing logs & caches..."
rm -rf logs
rm -rf backend/logs
rm -rf desktop-app/logs
rm -f *.log
rm -f .eslintcache
find . -name "*.log" -type f -delete 2>/dev/null || true

echo "Cleanup complete! Repository is in a pristine, source-only state."
