# Contributing to Justsent 🚀

Thank you for your interest in contributing to Justsent! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Improving documentation

---

## 🛠️ Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Use welcoming and inclusive language.
- Be respectful of differing viewpoints and experiences.
- Gracefully accept constructive criticism.
- Focus on what is best for the community.
- Show empathy towards other community members.

---

## 💻 Development Workflow

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Go** (v1.25+ recommended)
- **Node.js** (v18+)
- **Bun** (used for frontend package management and Tauri commands)
- **Tauri Prerequisites** (Xcode Command Line Tools for macOS)

### 2. Setting Up Your Environment
Follow these steps to get a local development environment running:

1. **Fork the repository** on GitHub and clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/justsent.git
   cd justsent
   ```

2. **Set up the backend daemon**:
   ```bash
   cd backend
   go mod download
   ```

3. **Set up the desktop app**:
   ```bash
   cd ../desktop-app
   bun install
   ```

4. **Launch the app in development mode**:
   ```bash
   bun run tauri:dev
   ```
   *Note: This script automatically releases ports `1420` and `8787` before starting the Vite dev server and Tauri client.*

---

## 🎨 Style Guides & Coding Standards

### Go Backend (`/backend`)
- **Formatting**: Always format your Go code using `gofmt` or `goimports`.
- **Database**: We use a pure-Go SQLite driver (`modernc.org/sqlite`). Do NOT introduce CGo dependencies or raw `go-sqlite3` imports.
- **Concurrency**: Use channels, sync primitives (`sync.Mutex`, `sync.RWMutex`), and context propagation properly to prevent race conditions. All handlers must support cancelable contexts.

### React Frontend (`/desktop-app/src`)
- **TypeScript**: Ensure strict type safety. Do not use `any` unless absolutely necessary.
- **Vanilla CSS**: We do not use CSS frameworks (like Tailwind). Custom styles belong in [App.css](file:///Users/adityakashyap/justsent/desktop-app/src/App.css). Utilize modern CSS custom properties (variables), transitions, and flexbox/grid layouts.
- **Performance**: Avoid unnecessary component re-renders. Use `useMemo`, `useCallback`, and properly scoped local state where appropriate.

---

## 📥 Submitting a Pull Request

1. **Create a Branch**: Create a feature branch off of `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Commit Changes**: Write clear, descriptive commit messages matching standard conventions:
   - `feat: add new nearby sharing progress indicators`
   - `fix: correct parent PID detection crash on exit`
   - `docs: update setup steps in README`
3. **Run Tests & Builds**:
   - Ensure the Go code builds successfully.
   - Run the frontend build locally to ensure no TypeScript or bundle compilation errors:
     ```bash
     cd desktop-app
     bun run build
     ```
4. **Push & Open PR**: Push to your fork and open a Pull Request against our `main` branch. Provide a detailed summary of what was changed and screenshot/video demonstrations of UI updates if applicable.

Thank you for building the future of local and remote sharing with us! 🧡
