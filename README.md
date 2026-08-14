# Justsent 🚀

Justsent is a secure, rapid file-sharing desktop application built using **Tauri**, **React (TypeScript)**, and a **Go** backend daemon. It allows users to stream files instantly to nearby devices over the local network, or globally over the internet via secure Cloudflare Tunnels.

---

## 🛠️ Prerequisites

Ensure you have the following installed:
- **Go** (v1.22+)
- **Node.js** (v20+) & **Bun** (recommended)
- **Rust/Cargo** (Tauri compilation toolchain)

---

## 💻 Running in Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/justsent.git
   cd justsent
   ```

2. **Initialize Go backend dependencies**:
   ```bash
   cd backend
   go mod download
   ```

3. **Install UI dependencies & run**:
   ```bash
   cd ../desktop-app
   bun install
   bun run tauri:dev
   ```
   *This starts the Go backend daemon and launches the React client application.*

---

## 🚀 Building for Release

We provide unified scripts under `scripts/` to automate compiling both the Go backend and packaging the Tauri application.

1. Make scripts executable:
   ```bash
   chmod +x scripts/*.sh
   ```

2. Run the release orchestrator:
   ```bash
   ./scripts/build-release.sh
   ```
   *This automatically detects your operating system, builds the correct target binaries (including lipo universal binaries on macOS), downloads `cloudflared`, bundles assets, and outputs native desktop installers under `desktop-app/src-tauri/target/release/bundle/`.*

   Alternatively, if you've already compiled the backend and only want to package the frontend/Tauri app, navigate to `desktop-app` and run:
   ```bash
   bun run tauri:build
   ```

---

## 📁 Project Structure

- `backend/`: Go daemon source code (server, configuration layer, SQLite db, structured logging).
- `desktop-app/`: Tauri wrapper source code and React/TypeScript frontend files.
- `scripts/`: Platform build scripts (`build-backend-mac.sh`, `build-backend-linux.sh`, `build-backend-windows.sh`, `build-release.sh`).

---

## 🚫 Generated Files

The following files are dynamically generated build artifacts and caches that should not be committed to Git:

- **Compiled binaries**: `justsent-backend` and `cloudflared` (placed in `desktop-app/src-tauri/resources/` during build compilation).
- **Tauri build outputs**: `desktop-app/src-tauri/target/` and packaged installers.
- **Node build outputs**: `desktop-app/dist/` and `desktop-app/node_modules/`.
- **Logs**: Structured JSON application logs located in standard OS user data folders or local `logs/` directories.

### How they are recreated:
- Run `./scripts/build-release.sh` to compile the Go daemon, fetch cloudflared, bundle UI files, and build the release packages.
- Run `bun run tauri:dev` to launch a local development build (recreates caches and targets).
