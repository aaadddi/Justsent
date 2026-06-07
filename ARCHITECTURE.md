# System Architecture Document

This document outlines the detailed system design, component boundaries, directory layouts, and runtime lifecycles of **Justsent**.

---

## 🗺️ Architectural Boundaries

Justsent is structured as three isolated layers that communicate over standard IPC (Inter-Process Communication) and HTTP APIs:

```
+------------------------------------------------------------------------+
|                               TAURI APPS                               |
|                                                                        |
|  +---------------------------+          +---------------------------+  |
|  |       React UI            |          |         Tauri Rust        |  |
|  |  - State management       |   IPC    |  - Window controller      |  |
|  |  - Drag-and-drop handles  |<-------->|  - Native process spawner |  |
|  |  - Custom CSS layouts     |          |  - Native folder reveals  |  |
|  +---------------------------+          +---------------------------+  |
+-------------------------------------------------------|----------------+
                                                        |
                                                        | Spawns with -resources-dir
                                                        v
+------------------------------------------------------------------------+
|                              GO BACKEND                                |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |                       Go Server Daemon                           |  |
|  |  - Custom HTTP router (net/http)                                 |  |
|  |  - Pure-Go SQLite Driver (modernc.org/sqlite)                    |  |
|  |  - Zero-allocation chunked file streamer                         |  |
|  |  - Cloudflared tunnel process wrapper                            |  |
|  +------------------------------------------------------------------+  |
+------------------------------------------------------------------------+
```

---

## 📂 Directory Layout

### Development Source Tree
```
justsent/
├── backend/                  # Go Backend daemon
│   ├── cmd/
│   │   └── justsent/
│   │       └── main.go       # Go entrypoint (cli, flags, server runner)
│   ├── config/               # Config schema, load logic, migrations
│   ├── internal/             # DB, handlers, share logic, logger
│   ├── go.mod
│   └── go.sum
├── desktop-app/              # Tauri Desktop application
│   ├── src/                  # React UI codebase (TypeScript / CSS)
│   ├── src-tauri/
│   │   ├── src/
│   │   │   └── lib.rs        # Tauri Rust configuration & life cycle hooks
│   │   ├── resources/        # Bundled runtime dependencies (cloudflared, backend, config template)
│   │   └── tauri.conf.json   # Tauri packaging settings
│   └── package.json
└── scripts/                  # Unified build/packaging scripts
    ├── build-backend-mac.sh
    ├── build-backend-linux.sh
    ├── build-backend-windows.sh
    └── build-release.sh
```

---

## 🚀 Native Lifecycle & Process Management

To prevent orphaned processes and memory leaks on the user's desktop, Justsent uses a robust native lifecycle orchestration:

1. **Native Spawning**:
   - Rather than relying on Tauri's default Sidecar Shell API (which runs into permission restrictions and makes it hard to locate assets dynamically), Tauri Rust spawns the Go backend using standard library `std::process::Command`.
   - On startup, Tauri resolves its `resource_dir()` path (where the backend binary, `cloudflared`, and default configurations are bundled) and passes it to the backend via the `-resources-dir` parameter.

2. **Clean Process Termination**:
   - On Tauri window exit (`RunEvent::ExitRequested`), Tauri Rust intercepts the event, retrieves the backend child handle from the Tauri State Container, and issues a SIGKILL/terminate to the backend, waiting for it to complete.
   - For unexpected terminations (such as force-kills or crashes of the parent), the Go backend runs a polling monitor that verifies its parent Process ID (PPID) every second. If the PPID becomes `1` (adopted by init) or changes from the initial PPID, the Go backend releases the Cloudflare tunnel and exits gracefully.

---

## 🗄️ Native User Data Storage & Migrations

All mutable application state is strictly separated from read-only bundled assets:

### Platform-specific Paths
* **macOS**: `~/Library/Application Support/JustSent/`
* **Windows**: `%APPDATA%/JustSent/`
* **Linux**: `~/.config/JustSent/`

### File Layout in User Directory
* `config.json`: Copy of the default config template migrated to schema version `1`.
* `justsent.db`: Local SQLite database containing share states, history logs, and options.
* `logs/justsent.log`: Structured JSON application logs.

### Versioned Schema Migration
- On launch, the Go backend runs a config migration. If `config.json` is missing under the user directory, it copies the defaults from the read-only resources folder.
- If the schema version of the local `config.json` is outdated, Go automatically migrates it to the newest version, merging defaults without wiping existing custom options.

---

## 📝 Logging Strategy & Log Rotation

- Justsent uses Go's structured `log/slog` library, outputting logs in production to `logs/justsent.log` as clean JSON records.
- In development mode (where no `-resources-dir` is passed), logs are multiplexed to standard output.
- **Auto-Rotation**: On startup, if the size of `justsent.log` exceeds 10MB, it is renamed to `justsent.log.old`, overwriting any prior old log file and creating a fresh log file to prevent disk exhaustion.

---

## ☁️ Network Sharing & Direct Streaming

- **Direct Transfers**: Justsent streams files directly from the host filesystem using `http.ServeContent` with full HTTP Range request support (allowing clients to resume, scrub media, and download chunk-by-chunk).
- **Over the Internet Sharing**: The Go backend spawns `cloudflared` dynamically, listening on the standard outputs to parse the generated TryCloudflare tunnel URL, returning it to the React UI for easy clipboard sharing.
