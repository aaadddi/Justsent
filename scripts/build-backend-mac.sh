#!/bin/bash
set -e

# Resolve project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# Target architecture (default to host arch)
ARCH="${1:-$(uname -m)}"

RESOURCES_DIR="desktop-app/src-tauri/resources"
mkdir -p "$RESOURCES_DIR"

VERSION=$(git describe --tags --always 2>/dev/null || echo "0.1.0")
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
LDFLAGS="-X main.Version=$VERSION -X main.Commit=$COMMIT -X main.BuildTime=$BUILD_TIME"

# Copy default config template to resources/config/config.json
mkdir -p "$RESOURCES_DIR/config"
if [ -f "backend/config.json" ]; then
  cp "backend/config.json" "$RESOURCES_DIR/config/config.json"
else
  # Write a default config.json
  cat <<EOF > "$RESOURCES_DIR/config/config.json"
{
  "version": 1,
  "server_port": "8787",
  "server_host": "localhost",
  "secret_key": "HeHeHe"
}
EOF
fi

if [ "$ARCH" = "universal" ]; then
  echo "Building Universal macOS backend..."
  cd backend
  GOOS=darwin GOARCH=arm64 go build -ldflags "$LDFLAGS" -o "../$RESOURCES_DIR/justsent-backend-arm64" ./cmd/justsent
  GOOS=darwin GOARCH=amd64 go build -ldflags "$LDFLAGS" -o "../$RESOURCES_DIR/justsent-backend-amd64" ./cmd/justsent
  cd ..
  lipo -create "$RESOURCES_DIR/justsent-backend-arm64" "$RESOURCES_DIR/justsent-backend-amd64" -output "$RESOURCES_DIR/justsent-backend"
  rm "$RESOURCES_DIR/justsent-backend-arm64" "$RESOURCES_DIR/justsent-backend-amd64"

  # Fetch cloudflared
  CLOUDFLARED_BIN="$RESOURCES_DIR/cloudflared"
  if [ ! -f "$CLOUDFLARED_BIN" ]; then
    echo "cloudflared binary not found in resources. Downloading and creating universal binary..."
    TEMP_DIR=$(mktemp -d)
    
    # Download arm64
    curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz" -o "$TEMP_DIR/cf-arm64.tgz"
    tar -xzf "$TEMP_DIR/cf-arm64.tgz" -C "$TEMP_DIR"
    mv "$TEMP_DIR/cloudflared" "$TEMP_DIR/cf-arm64"
    
    # Download amd64
    curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz" -o "$TEMP_DIR/cf-amd64.tgz"
    tar -xzf "$TEMP_DIR/cf-amd64.tgz" -C "$TEMP_DIR"
    mv "$TEMP_DIR/cloudflared" "$TEMP_DIR/cf-amd64"
    
    # Create universal binary
    lipo -create "$TEMP_DIR/cf-arm64" "$TEMP_DIR/cf-amd64" -output "$CLOUDFLARED_BIN"
    rm -rf "$TEMP_DIR"
  fi
else
  if [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
    GOARCH="arm64"
    CLOUDFLARED_ARCH="arm64"
  else
    GOARCH="amd64"
    CLOUDFLARED_ARCH="amd64"
  fi

  echo "Building Go backend for macOS ($GOARCH)..."
  cd backend
  GOOS=darwin GOARCH=$GOARCH go build -ldflags "$LDFLAGS" -o "../$RESOURCES_DIR/justsent-backend" ./cmd/justsent
  cd ..

  # Fetch cloudflared
  CLOUDFLARED_BIN="$RESOURCES_DIR/cloudflared"
  if [ ! -f "$CLOUDFLARED_BIN" ]; then
    echo "cloudflared binary not found in resources. Downloading for macOS $CLOUDFLARED_ARCH..."
    TEMP_DIR=$(mktemp -d)
    
    # Download cloudflared tgz from GitHub releases
    URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-${CLOUDFLARED_ARCH}.tgz"
    echo "Downloading from $URL..."
    curl -L "$URL" -o "$TEMP_DIR/cloudflared.tgz"
    
    tar -xzf "$TEMP_DIR/cloudflared.tgz" -C "$TEMP_DIR"
    mv "$TEMP_DIR/cloudflared" "$CLOUDFLARED_BIN"
    rm -rf "$TEMP_DIR"
  fi
fi

chmod +x "$RESOURCES_DIR/justsent-backend"
chmod +x "$RESOURCES_DIR/cloudflared"

echo "macOS Backend build completed successfully."
