#!/bin/bash
set -e

# Resolve project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# Detect OS
OS_NAME=$(uname -s)
echo "Detected OS: $OS_NAME"

case "$OS_NAME" in
  Darwin*)
    ./scripts/build-backend-mac.sh universal
    ;;
  Linux*)
    ./scripts/build-backend-linux.sh
    ;;
  CYGWIN*|MINGW*|MSYS*)
    ./scripts/build-backend-windows.sh
    ;;
  *)
    echo "Unsupported OS for building release: $OS_NAME"
    exit 1
    ;;
esac

echo "Building Tauri app package..."
cd desktop-app
# Ensure dependencies are installed
if [ -f "bun.lockb" ]; then
  bun install
elif [ -f "package-lock.json" ]; then
  npm install
else
  npm install
fi

# Build tauri package
if hash bunx 2>/dev/null; then
  bunx tauri build
elif hash npx 2>/dev/null; then
  npx tauri build
else
  cargo tauri build
fi

echo "Tauri Release build completed successfully!"
