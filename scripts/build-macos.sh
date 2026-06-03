#!/bin/bash

set -e

echo "Building Go backend..."
pwd

ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  TRIPLE="aarch64-apple-darwin"
  GOARCH="arm64"
else
  TRIPLE="x86_64-apple-darwin"
  GOARCH="amd64"
fi

echo "Detected host architecture: $ARCH, target triple: $TRIPLE"

# Ensure the bin directory exists
mkdir -p desktop-app/src-tauri/bin

cd backend
GOOS=darwin GOARCH=$GOARCH go build -o ../desktop-app/src-tauri/bin/justsent-backend-$TRIPLE
cd ..

echo "Copying cloudflared..."
cp backend/bin/mac/cloudflared desktop-app/src-tauri/bin/cloudflared-$TRIPLE

echo "Making binaries executable..."
chmod +x desktop-app/src-tauri/bin/justsent-backend-$TRIPLE
chmod +x desktop-app/src-tauri/bin/cloudflared-$TRIPLE

echo "Building Tauri app..."
cd desktop-app
bun run tauri build

echo "Build complete."