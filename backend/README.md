# Justsent Backend Daemon 🐹

The backend service for **Justsent** is written in Go and runs as a local background daemon. It exposes REST API handlers to the React frontend client and serves public HTTP file streaming pages to downloaders.

---

## 🛠️ Features

- **Embedded Assets**: Embeds templates using Go's `embed` package to serve download HTML pages directly without filesystem dependencies.
- **SQLite Database Cache**: Uses a pure-Go SQLite driver (`modernc.org/sqlite`) so no CGo or GCC compilers are needed for cross-compilation.
- **Direct HTTP File Streaming**: Implements chunked binary transfers using `http.ServeContent` to support resuming paused downloads and media range requests.
- **Tunnel Lifecycle Control**: Hooks into parent PID exit signals to automatically close and release public Cloudflare quick tunnels when the Tauri UI exits.

---

## 🛣️ API Handler Endpoints

All client requests run locally on port `8787` (configured in `config/config.go`).

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/health` | `GET` | Verifies that the Go backend daemon is alive. |
| `/v1/settings` | `GET` | Fetches application settings and versions. |
| `/v1/shares` | `GET`, `POST` | Lists historical shares or creates a new active tunnel share. |
| `/v1/transfers` | `GET` | Fetches progress logs and bytes written stats for active shares. |
| `/v1/files/check` | `POST` | Validates if the local shared files still exist at their absolute paths. |
| `/share/:token` | `GET` | serves the embedded downloader landing page. |
| `/share/:token/download` | `GET` | Starts binary streaming of the file(s). |

---

## 💻 Cross-Compilation sidecars

To package the Go daemon as a Tauri sidecar on macOS, compile the binaries matching target architectures (e.g. Intel and Apple Silicon):

```bash
# Compile for Apple Silicon macOS
GOOS=darwin GOARCH=arm64 go build -o bin/backend-aarch64-apple-darwin main.go

# Compile for Intel macOS
GOOS=darwin GOARCH=amd64 go build -o bin/backend-x86_64-apple-darwin main.go
```
Place the compiled binary outputs inside the `desktop-app/src-tauri/bin/` folder.
