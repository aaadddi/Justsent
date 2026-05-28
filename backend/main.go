package main

import (
	"backend-app/config"
	"backend-app/internal/db"
	"backend-app/internal/handlers"
	"backend-app/internal/share"
	"fmt"
	"net/http"
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
		fmt.Fprintln(w, "JustSent backend running")
	}))

	http.HandleFunc("/health", enableCORS(handlers.HandleHealth))
	http.HandleFunc("/v1/settings", enableCORS(handlers.HandleSettings))
	http.HandleFunc("/v1/shares", enableCORS(handlers.HandleShares))
	http.HandleFunc("/v1/transfers", enableCORS(handlers.HandleTransfers))
	http.HandleFunc("/share/", enableCORS(handlers.HandleDownload))

	// START SERVER IN BACKGROUND
	go func() {
		fmt.Printf("Server running on :%s\n", config.ServerPort)

		err := http.ListenAndServe(":"+config.ServerPort, nil)
		if err != nil {
			panic(err)
		}
	}()
	select {}
}
