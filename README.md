# Justsent 🚀

Justsent is a premium, secure, and rapid file-sharing desktop application built using **Tauri**, **React (TypeScript)**, and a **Go** backend daemon. Designed with a sleek, minimalist macOS aesthetic, it allows users to transfer files instantly either locally to nearby devices or globally over the internet via secure Cloudflare Tunnels—all with optional password protection and detailed history logs.

---

## ✨ Features

- **Double-Channel Sharing**:
  - 🌐 **Internet Sharing**: Generates a secure, temporary Cloudflare tunnel URL so anyone, anywhere can download your files directly from your machine.
  - 🏡 **Nearby Sharing**: Creates a local IP/port link for high-speed transfers to devices on the same Wi-Fi router.
- **Privacy & Security first**:
  - 🔒 **Password Protection**: Enforce password entry for download pages.
  - 📝 **Custom Notes**: Leave personal notes or download instructions visible on the web share page.
  - 🛡️ **No Third-Party Hosting**: Your files are streamed directly from your machine. Once you stop sharing, the access tunnel is deleted immediately.
- **Detailed History & Logs**:
  - 📊 Track share instances (both active and expired).
  - 📂 **Reveal in Finder** (with built-in broken path detection).
  - ⏱️ Collapsible download log histories showing downloader IPs and timestamps.
  - 🖱️ **"Sharing" Status Badge**: An interactive indicator on the Transfers tab. Clicking it triggers a pulse highlighting effect on all actively shared cards.

---

## 🏗️ Architecture Overview

Justsent uses a modern **Client-Daemon architecture**:

```
                  +----------------------------------------+
                  |               Tauri Client             |
                  |  (Rust wrapper + React/TS Frontend)    |
                  +-------------------+--------------------+
                                      |
                                      | Tauri Sidecar / IPC
                                      v
                  +----------------------------------------+
                  |               Go Daemon                |
                  | (Local HTTP Server + SQLite Cache DB)  |
                  +-------------------+--------------------+
                                      |
                    +-----------------+-----------------+
                    |                                   |
                    v (Nearby)                          v (Internet)
         +--------------------+              +--------------------+
         |   Local Wi-Fi IP   |              | Cloudflare Tunnel  |
         |  Direct Streaming  |              |    (cloudflared)   |
         +--------------------+              +--------------------+
```

1. **Frontend (React & TypeScript)**: An adaptive macOS-style user interface built with custom CSS, responsive navigation, drop-zones, and collapsible log drawers.
2. **Backend Daemon (Go)**: A lightweight, background-running Go application that handles file reads, serves download pages, writes sharing histories to a local SQLite database, and handles Cloudflare tunnel initialization.
3. **Rust Tauri Wrapper**: Wraps the frontend UI and orchestrates launch/kill triggers to ensure the Go backend daemon is terminated safely when the window is closed.

---

## 🛠️ Getting Started

### Prerequisites

To build and run Justsent locally, you need:

- **Go** (v1.25+ recommended)
- **Node.js** (v18+) & **Bun** (for faster package execution)
- **Tauri Prerequisites** (Xcode Command Line Tools for macOS)

---

### Installation & Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/justsent.git
   cd justsent
   ```

2. **Initialize Backend Dependencies**:
   ```bash
   cd backend
   go mod download
   ```

3. **Install Frontend Dependencies**:
   ```bash
   cd ../desktop-app
   bun install
   ```

4. **Run the App in Development Mode**:
   Tauri automatically starts both the Go backend sidecar and the React development frontend:
   ```bash
   bun run tauri:dev
   ```

---

## 🚀 Building for Production

To compile a native macOS bundle:

```bash
cd desktop-app
bun run build
bun run tauri build
```
This generates a compiled, optimized, and sandboxed `.app` / `.dmg` installer inside the `src-tauri/target/release/bundle` directory.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
