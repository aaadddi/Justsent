package main

import (
	"backend-app/config"
	"backend-app/internal/db"
	"backend-app/internal/handlers"
	"backend-app/internal/logger"
	"backend-app/internal/share"
	"backend-app/internal/tunnel"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

var (
	Version   = "dev"
	Commit    = "unknown"
	BuildTime = "unknown"
)

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func main() {
	// Parse CLI flags
	flag.StringVar(&config.ResourcesDir, "resources-dir", "", "Path to the bundled resources directory")
	flag.Parse()

	// Detect if running in development mode (no resources directory provided)
	isDev := config.ResourcesDir == ""

	// Initialize Logger
	if err := logger.Init(config.UserDataDir(), isDev); err != nil {
		fmt.Fprintf(os.Stderr, "failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Close()

	slog.Info("Starting JustSent Backend...",
		"version", Version,
		"commit", Commit,
		"buildTime", BuildTime,
		"isDev", isDev,
		"userDataDir", config.UserDataDir(),
		"resourcesDir", config.ResourcesDir,
	)

	// Run configuration schema migration
	if err := config.MigrateConfig(); err != nil {
		slog.Error("failed to migrate configuration schema", "error", err)
		os.Exit(1)
	}

	// Load configuration variables
	if err := config.LoadConfig(); err != nil {
		slog.Warn("could not load config.json, using default options", "error", err)
	}

	// Initialize SQLite DB
	if err := db.InitDB(); err != nil {
		slog.Error("failed to initialize SQLite database", "error", err)
		os.Exit(1)
	}

	// Load existing shares from database into cache
	if err := share.Load(); err != nil {
		slog.Error("failed to load shares from database", "error", err)
		os.Exit(1)
	}

	http.HandleFunc("/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Justsent backend running")
	}))

	http.HandleFunc("/health", enableCORS(handlers.HandleHealth))
	http.HandleFunc("/v1/settings", enableCORS(handlers.HandleSettings))
	http.HandleFunc("/v1/shares", enableCORS(handlers.HandleShares))
	http.HandleFunc("/v1/transfers", enableCORS(handlers.HandleTransfers))
	http.HandleFunc("/v1/files/check", enableCORS(handlers.HandleCheckFiles))
	http.HandleFunc("/share/", enableCORS(handlers.HandleDownload))

	http.HandleFunc("/v1/version", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"version":%q,"commit":%q,"buildTime":%q}`, Version, Commit, BuildTime)
	}))

	// START SERVER IN BACKGROUND
	go func() {
		slog.Info("Server listening", "host", config.ServerHost, "port", config.ServerPort)

		err := http.ListenAndServe(":"+config.ServerPort, nil)
		if err != nil {
			slog.Error("HTTP Server execution failed", "error", err)
			os.Exit(1)
		}
	}()

	// Channel to listen for signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Monitor parent PID to detect if parent process (Tauri app) exited and orphaned us
	go func() {
		initialPPID := os.Getppid()
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			currentPPID := os.Getppid()
			if currentPPID == 1 || currentPPID != initialPPID {
				slog.Warn("Parent process terminated. Initiating backend cleanup...")
				sigChan <- syscall.SIGTERM
				return
			}
		}
	}()

	// Wait for shutdown signal
	sig := <-sigChan
	slog.Info("Received shutdown signal", "signal", sig)

	// Clean up tunnel
	if err := tunnel.Release(); err != nil {
		slog.Error("Error releasing Cloudflare tunnel during cleanup", "error", err)
	}

	slog.Info("Backend shutdown complete.")
}
