package main

import (
	"archive/zip"
	"backend-app/config"
	"backend-app/internal/share"
	"backend-app/internal/tunnel"
	"backend-app/internal/types"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

var (
	tunnelURL       string
	activeTransfers = map[string]*types.TransferStats{}
	transfersMu     sync.RWMutex
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

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status": "ok"}`))
}

func handleShares(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		type CreateReq struct {
			Paths []string `json:"paths"`
			Label string   `json:"label"`
		}
		var req CreateReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}
		if len(req.Paths) == 0 {
			http.Error(w, "No files specified", http.StatusBadRequest)
			return
		}

		baseURL := tunnelURL
		if baseURL == "" {
			baseURL = "http://localhost:" + config.ServerPort
		}

		s, err := share.Create(req.Paths, req.Label, baseURL)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		resp := types.CreateResp{
			Token:         s.Token,
			DownloadURL:   s.DownloadURL,
			ShareID:       s.ID,
			PublicBaseURL: baseURL,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	} else if r.Method == http.MethodGet {
		list := share.List()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"shares": list,
		})
		return
	} else if r.Method == http.MethodDelete {
		token := r.URL.Query().Get("token")
		if token == "" {
			parts := strings.Split(r.URL.Path, "/")
			if len(parts) > 3 {
				token = parts[3]
			}
		}

		if token == "" {
			http.Error(w, "Missing token", http.StatusBadRequest)
			return
		}

		deleted := share.Delete(token)
		if !deleted {
			http.Error(w, "Share not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status": "deleted"}`))
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

type progressWriter struct {
	w        http.ResponseWriter
	token    string
	lastTime time.Time
}

func (pw *progressWriter) Header() http.Header {
	return pw.w.Header()
}

func (pw *progressWriter) Write(p []byte) (int, error) {
	// Check if the share has been deleted/stopped
	if _, exists := share.Get(pw.token); !exists {
		return 0, fmt.Errorf("share aborted by host")
	}

	n, err := pw.w.Write(p)
	if n > 0 {
		transfersMu.Lock()
		if stats, exists := activeTransfers[pw.token]; exists {
			stats.BytesWritten += int64(n)
			now := time.Now()
			elapsed := now.Sub(pw.lastTime).Seconds()
			if elapsed >= 0.5 { // calculate speed every 500ms
				elapsedSinceStart := now.Sub(stats.StartTime).Seconds()
				if elapsedSinceStart > 0 {
					stats.Speed = float64(stats.BytesWritten) / elapsedSinceStart
				}
				stats.LastUpdated = now
				pw.lastTime = now
			}
		}
		transfersMu.Unlock()
	}
	return n, err
}

func (pw *progressWriter) WriteHeader(statusCode int) {
	pw.w.WriteHeader(statusCode)
}

func handleTransfers(w http.ResponseWriter, r *http.Request) {
	transfersMu.RLock()
	defer transfersMu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(activeTransfers)
}

func handleDownload(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimPrefix(r.URL.Path, "/share/")
	if token == "" {
		http.NotFound(w, r)
		return
	}

	s, exists := share.Get(token)
	if !exists {
		http.NotFound(w, r)
		return
	}

	if len(s.FilePaths) == 0 {
		http.Error(w, "No files in share", http.StatusInternalServerError)
		return
	}

	// Initialize active transfer
	transfersMu.Lock()
	activeTransfers[token] = &types.TransferStats{
		Token:        token,
		BytesWritten: 0,
		TotalBytes:   s.TotalSize,
		IsActive:     true,
		StartTime:    time.Now(),
		LastUpdated:  time.Now(),
	}
	transfersMu.Unlock()

	defer func() {
		transfersMu.Lock()
		delete(activeTransfers, token)
		transfersMu.Unlock()
	}()

	pw := &progressWriter{
		w:        w,
		token:    token,
		lastTime: time.Now(),
	}

	if len(s.FilePaths) == 1 {
		filePath := s.FilePaths[0]
		file, err := os.Open(filePath)
		if err != nil {
			http.Error(w, "Failed to open file", http.StatusInternalServerError)
			return
		}
		defer file.Close()

		fileInfo, err := file.Stat()
		if err != nil {
			http.Error(w, "Failed to stat file", http.StatusInternalServerError)
			return
		}

		pw.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileInfo.Name()))
		pw.Header().Set("Content-Type", "application/octet-stream")
		pw.Header().Set("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))

		http.ServeContent(pw, r, fileInfo.Name(), fileInfo.ModTime(), file)
		return
	}

	// Serve zipped files on-the-fly
	pw.Header().Set("Content-Type", "application/zip")
	pw.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.zip\"", s.Label))

	zipWriter := zip.NewWriter(pw)
	defer zipWriter.Close()

	for _, path := range s.FilePaths {
		func() {
			file, err := os.Open(path)
			if err != nil {
				return
			}
			defer file.Close()

			fileInfo, err := file.Stat()
			if err != nil {
				return
			}

			header, err := zip.FileInfoHeader(fileInfo)
			if err != nil {
				return
			}

			header.Name = filepath.Base(path)
			header.Method = zip.Deflate

			writer, err := zipWriter.CreateHeader(header)
			if err != nil {
				return
			}

			_, _ = io.Copy(writer, file)
		}()
	}
}

func main() {
	http.HandleFunc("/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "JustSent backend running")
	}))

	http.HandleFunc("/health", enableCORS(handleHealth))
	http.HandleFunc("/v1/shares", enableCORS(handleShares))
	http.HandleFunc("/v1/transfers", enableCORS(handleTransfers))
	http.HandleFunc("/share/", enableCORS(handleDownload))

	// START SERVER IN BACKGROUND
	go func() {
		fmt.Printf("Server running on :%s\n", config.ServerPort)

		err := http.ListenAndServe(":"+config.ServerPort, nil)
		if err != nil {
			panic(err)
		}
	}()

	// START TUNNEL AFTER SERVER
	t, err := tunnel.Start()
	if err != nil {
		panic(err)
	}

	tunnelURL = t.URL

	fmt.Println("Tunnel URL:", tunnelURL)

	// KEEP APP RUNNING
	select {}
}
