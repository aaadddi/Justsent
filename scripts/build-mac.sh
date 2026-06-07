#!/bin/bash
# build-mac.sh - Build Go backend for darwin-arm64 and package the Tauri app.

set -e

# Resolve project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

RESOURCES_DIR="desktop-app/src-tauri/resources"
mkdir -p "$RESOURCES_DIR"

echo "Building Go backend for macOS Apple Silicon (darwin-arm64)..."
VERSION="${VERSION:-$(git describe --tags --always 2>/dev/null || echo "0.1.0")}"
COMMIT="${COMMIT:-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")}"
BUILD_TIME="${BUILD_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
LDFLAGS="-X main.Version=$VERSION -X main.Commit=$COMMIT -X main.BuildTime=$BUILD_TIME"

cd backend
GOOS=darwin GOARCH=arm64 go build -ldflags "$LDFLAGS" -o "../$RESOURCES_DIR/justsent-backend" cmd/justsent/main.go
cd ..

# Copy default config template to resources/config/config.json
mkdir -p "$RESOURCES_DIR/config"
if [ -f "backend/config.json" ]; then
  cp "backend/config.json" "$RESOURCES_DIR/config/config.json"
else
  cat <<EOF > "$RESOURCES_DIR/config/config.json"
{
  "version": 1,
  "server_port": "8787",
  "server_host": "localhost",
  "secret_key": "HeHeHe"
}
EOF
fi

# Verify backend exists
if [ ! -f "$RESOURCES_DIR/justsent-backend" ]; then
  echo "Error: justsent-backend binary was not created!" >&2
  exit 1
fi

# Fetch cloudflared for macOS ARM64
CLOUDFLARED_BIN="$RESOURCES_DIR/cloudflared"
if [ ! -f "$CLOUDFLARED_BIN" ]; then
  echo "cloudflared binary not found in resources. Downloading for macOS arm64..."
  TEMP_DIR=$(mktemp -d)
  
  URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz"
  echo "Downloading from $URL..."
  curl -L "$URL" -o "$TEMP_DIR/cloudflared.tgz"
  
  tar -xzf "$TEMP_DIR/cloudflared.tgz" -C "$TEMP_DIR"
  mv "$TEMP_DIR/cloudflared" "$CLOUDFLARED_BIN"
  rm -rf "$TEMP_DIR"
fi

# Verify cloudflared exists
if [ ! -f "$CLOUDFLARED_BIN" ]; then
  echo "Error: cloudflared binary is missing from resources!" >&2
  exit 1
fi

chmod +x "$RESOURCES_DIR/justsent-backend"
chmod +x "$CLOUDFLARED_BIN"

echo "Backend and resources prepared. Building Tauri app..."
cd desktop-app

# Ensure dependencies are installed
if [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
  bun install
elif [ -f "package-lock.json" ]; then
  npm install
else
  npm install
fi

# Run tauri build (Vite client build first, then Tauri bundling)
if hash bunx 2>/dev/null; then
  bunx tauri build --target aarch64-apple-darwin
elif hash npx 2>/dev/null; then
  npx tauri build --target aarch64-apple-darwin
else
  cargo tauri build --target aarch64-apple-darwin
fi

APP_PATH="src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Justsent.app"
if [ -d "$APP_PATH" ]; then
  echo "Ad-hoc codesigning the entire app bundle recursively..."
  # Clean old signature components
  find "$APP_PATH" -name "_CodeSignature" -exec rm -rf {} + || true
  # Sign recursively
  codesign --force --deep --sign - "$APP_PATH"
  
  echo "Re-verifying app bundle signature..."
  codesign --verify --deep --strict --verbose=4 "$APP_PATH"
  
  # Re-burn the DMG so it contains the signed app bundle
  echo "Re-generating signed DMG installer..."
  DMG_DIR="src-tauri/target/aarch64-apple-darwin/release/bundle/dmg"
  mkdir -p "$DMG_DIR"
  rm -f "$DMG_DIR/Justsent_0.1.0_aarch64.dmg"
  hdiutil create -volname "Justsent" -srcfolder "src-tauri/target/aarch64-apple-darwin/release/bundle/macos" -ov -format UDZO "$DMG_DIR/Justsent_0.1.0_aarch64.dmg"
fi

echo "macOS ARM64 Build completed successfully."
