# Build & Automation Scripts ⚙️

This directory contains utility scripts for automating developer tasks, cross-compiling sidecars, and packaging Justsent for distribution.

---

## 🛠️ Scripts Overview

### 1. `build-macos.sh`
This script automates compiling the Go backend daemon, setting up the required Tauri sidecar binary assets, and packaging the desktop client into a native macOS application bundle.

#### Prerequisites
Before running the build script, ensure you have:
- [Go](https://go.dev/) (installed and in your `PATH`)
- [Bun](https://bun.sh/) (installed and in your `PATH`)
- A local copy of `cloudflared` binary placed at `backend/bin/mac/cloudflared`

#### What it does:
1. Detects the host machine architecture (`arm64` vs `x86_64`).
2. Compiles the Go backend to target the host's platform architecture, outputting it with the correct Tauri-compliant target triple name (e.g. `justsent-backend-aarch64-apple-darwin`) under `desktop-app/src-tauri/bin/`.
3. Copies the `cloudflared` binary into the `src-tauri/bin/` folder with the target triple name (e.g. `cloudflared-aarch64-apple-darwin`).
4. Makes both binaries executable (`chmod +x`).
5. Triggers `bun run tauri build` to compile the frontend and package it into an optimized `.dmg`/`.app` installer.

#### Usage:
Run the script from the root workspace directory:
```bash
chmod +x scripts/build-macos.sh
./scripts/build-macos.sh
```

---

## 🏗️ Cross-Compiling Sidecars Manually

If you need to compile sidecars for multiple architectures manually, run the following commands:

```bash
# Intel macOS Target (x86_64)
cd backend
GOOS=darwin GOARCH=amd64 go build -o ../desktop-app/src-tauri/bin/justsent-backend-x86_64-apple-darwin main.go

# Apple Silicon macOS Target (aarch64)
GOOS=darwin GOARCH=arm64 go build -o ../desktop-app/src-tauri/bin/justsent-backend-aarch64-apple-darwin main.go
```
Ensure you also rename and copy matching `cloudflared` binaries for both architectures into `desktop-app/src-tauri/bin/` before compiling the final Tauri package.
