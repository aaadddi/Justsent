#!/bin/bash

set -e

echo "Building Go backend..."

cd ../backend

GOOS=darwin GOARCH=arm64 go build -o ../desktop-app/src-tauri/bin/justsent-backend

cd ..

echo "Copying cloudflared..."

cp backend/bin/mac/cloudflared desktop-app/src-tauri/bin/

echo "Making binaries executable..."

chmod +x desktop-app/src-tauri/bin/justsent-backend
chmod +x desktop-app/src-tauri/bin/cloudflared

echo "Building Tauri app..."

cd desktop-app

bun run tauri build

echo "Build complete."