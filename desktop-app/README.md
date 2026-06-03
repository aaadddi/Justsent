# Justsent Desktop Client 🖥️

This directory contains the desktop frontend codebase of **Justsent**, built with React 19, Vite 7, TypeScript, and the Tauri 2 Framework.

---

## 🛠️ Tech Stack

- **Framework**: [Tauri v2](https://tauri.app/) (Rust-based system integration wrapper)
- **UI Library**: [React v19](https://react.dev/)
- **Build Tool**: [Vite v7](https://vite.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS (see `src/App.css` for typography, color systems, and animations)

---

## 📂 Project Structure

- `src/` - The React application codebase.
  - `src/Components/` - Reusable layout modules (e.g. `FileCard`, `DropZone`, `HistoryView`).
  - `src/utils/` - Formatter helpers (e.g. file size parsing, file extensions styling maps).
  - `src/lib/` - Client APIs linking frontend commands to the Go backend endpoints.
- `src-tauri/` - The Rust source files config and sidecar compilation files.

---

## 💻 Development Commands

Make sure the Go backend dependencies are compiled and placed correctly before running locally.

### Start Developer Server
```bash
bun run tauri:dev
```
This script automatically:
1. Kills processes occupying ports `1420` and `8787` (to clear local web server locks).
2. Spawns Vite's local dev server.
3. Launches the Tauri client window.

### Build and Package App
```bash
bun run build
bun run tauri build
```
This compiles the TypeScript code and produces optimized bundles in `dist/`, which Tauri packages into a macOS `.dmg` / `.app` bundle.
