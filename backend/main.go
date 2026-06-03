package main

import (
	"backend-app/config"
	"backend-app/internal/db"
	"backend-app/internal/handlers"
	"backend-app/internal/share"
	"backend-app/internal/tunnel"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
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
	// Initialize SQLite DB
	if err := db.InitDB(); err != nil {
		panic(fmt.Sprintf("failed to initialize SQLite database: %v", err))
	}

	// Load existing shares from database into cache
	if err := share.Load(); err != nil {
		panic(fmt.Sprintf("failed to load shares from database: %v", err))
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

	// START SERVER IN BACKGROUND
	go func() {
		fmt.Printf("Server running on :%s\n", config.ServerPort)

		err := http.ListenAndServe(":"+config.ServerPort, nil)
		if err != nil {
			panic(err)
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
				fmt.Println("Parent process terminated. Initiating backend cleanup...")
				sigChan <- syscall.SIGTERM
				return
			}
		}
	}()

	// Wait for shutdown signal
	sig := <-sigChan
	fmt.Printf("Received signal: %v. Cleaning up tunnel...\n", sig)

	// Clean up tunnel
	if err := tunnel.Release(); err != nil {
		fmt.Printf("Error releasing tunnel: %v\n", err)
	}

	fmt.Println("Backend shutdown complete.")
}
