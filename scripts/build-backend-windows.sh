#!/bin/bash
set -e

# Resolve project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# Target architecture (default to host arch)
ARCH="${1:-$(uname -m)}"
if [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
  GOARCH="arm64"
  CLOUDFLARED_ARCH="arm64"
else
  GOARCH="amd64"
  CLOUDFLARED_ARCH="amd64"
fi

RESOURCES_DIR="desktop-app/src-tauri/resources"
mkdir -p "$RESOURCES_DIR"

echo "Building Go backend for Windows ($GOARCH)..."
VERSION=$(git describe --tags --always 2>/dev/null || echo "0.1.0")
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
LDFLAGS="-X main.Version=$VERSION -X main.Commit=$COMMIT -X main.BuildTime=$BUILD_TIME"

cd backend
GOOS=windows GOARCH=$GOARCH go build -ldflags "$LDFLAGS" -o "../$RESOURCES_DIR/justsent-backend.exe" ./cmd/justsent
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

# Fetch cloudflared
CLOUDFLARED_BIN="$RESOURCES_DIR/cloudflared.exe"
if [ ! -f "$CLOUDFLARED_BIN" ]; then
  echo "cloudflared binary not found in resources. Downloading for Windows $CLOUDFLARED_ARCH..."
  URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-${CLOUDFLARED_ARCH}.exe"
  echo "Downloading from $URL..."
  curl -L "$URL" -o "$CLOUDFLARED_BIN"
fi

chmod +x "$RESOURCES_DIR/justsent-backend.exe"
chmod +x "$CLOUDFLARED_BIN"

echo "Windows Backend build completed successfully."
