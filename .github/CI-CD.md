# CI/CD Workflow Documentation 🚀

This document outlines the GitHub Actions continuous integration and continuous deployment pipelines configured for **JustSent**.

---

## 🛠️ How the CI Workflow Works

The CI workflow is configured inside [.github/workflows/ci.yml](file:///Users/adityakashyap/justsent/.github/workflows/ci.yml) and performs validation checks on every commit push and pull request.

### Triggers
- **Pushes** on any branch.
- **Pull Requests** targeting any branch.

### Execution Steps
1. **Runner Environment**: Executes on standard `macos-latest` hosted runners to compile native macOS code.
2. **Prerequisites & Tooling**: Installs Go (stable), Rust (stable), and Bun (stable).
3. **Caching**: Caches Go modules, Bun package registers, and Cargo dependencies (`target/` and registries) to speed up compile times.
4. **Compilation**: Runs the custom `./scripts/build-mac.sh` script to build the Go backend daemon targeting `darwin-arm64`, download `cloudflared`, verify target resource integrity, and compile the Tauri React application.
5. **Artifact Assembly**: Compiles a `build-info.json` record containing git hashes, build timestamps, and release versions. The zipped application (`JustSent.app`) and macOS installer (`JustSent.dmg`) are copied alongside `build-info.json`.
6. **Artifact Upload**: Publishes the bundle as a downloadable GitHub Actions artifact named `justsent-mac-build` with a **14-day retention limit**.

---

## 🚀 How the Release Workflow Works

The Release workflow is configured inside [.github/workflows/release.yml](file:///Users/adityakashyap/justsent/.github/workflows/release.yml) and compiles production packages automatically when changes merge.

### Triggers
- **Pushes** directly to the `main` branch.

### Release & Tagging Generation
1. **Compilation**: Checks out code and executes `./scripts/build-mac.sh` to compile release-optimized macOS Apple Silicon installers.
2. **Tagging Structure**: Automatically tags the commit using the format:
   `build-<short-sha>`
3. **Release Name**: Publishes a release under the naming scheme:
   `JustSent Build <full-git-sha>`
4. **Release Asset**: Uploads the production `JustSent.dmg` disk image.
5. **Release Notes**: Automatically generates change notes by scanning commit histories between release tags.

---

## 📥 How to Download Artifacts

1. Navigate to the **Actions** tab on your GitHub repository.
2. Select the running or completed workflow run (e.g., a specific Pull Request check).
3. Scroll down to the **Artifacts** section at the bottom of the summary page.
4. Click on `justsent-mac-build` to download a zip archive.
5. Extract the archive to find:
   - `JustSent.dmg`: The macOS installer.
   - `JustSent.app`: The runnable macOS application bundle.
   - `build-info.json`: JSON file detailing build metadata.

---

## ❌ Failure Conditions & Troubleshooting

If a workflow fails, check the Actions execution logs for the specific step that errored out. 

The build pipeline will fail immediately if:
- **Go build fails**: Code compiler syntax error or invalid dependencies in `/backend`.
- **TypeScript/Vite build fails**: Syntax errors or strictly typed interface mismatches in `/desktop-app/src`.
- **Rust build fails**: Compilation issues in `/desktop-app/src-tauri`.
- **Tauri build fails**: Invalid packaging metadata in `tauri.conf.json`.
- **Missing backend binary**: The Go build exited cleanly but did not output `justsent-backend` to the Tauri resources folder.
- **Missing cloudflared resource**: Downloading or placing the `cloudflared` binary into the resource folder failed.

### Gatekeeper & Quarantine Warning ("Damaged App")

Since the compiled application is ad-hoc signed in the GitHub Actions runner (without a registered Apple Developer Account certificate), macOS applies a security quarantine flag (`com.apple.quarantine`) on the downloaded files, blocking them from execution and displaying a warning that the app is **"damaged and can't be opened"**.

#### To resolve this:
Open the Terminal and strip the quarantine attribute from the app or disk image before launching it:

```bash
# Strip quarantine from the .app bundle:
xattr -cr /path/to/Justsent.app

# Or strip quarantine from the downloaded DMG installer:
xattr -cr /path/to/JustSent.dmg
```

Once executed, the application will open normally.

### Local Replication
To reproduce the build environment locally to debug issues:
1. Ensure prerequisites (Go, Node, Rust, Bun) are configured.
2. Run `./scripts/clean.sh` to clean old build outputs.
3. Run the macOS build script:
   ```bash
   ./scripts/build-mac.sh
   ```
