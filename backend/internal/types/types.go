package types

import (
	"context"
	"net/http"
	"time"
)

type DownloadHistoryItem struct {
	DownloaderIP string    `json:"downloader_ip"`
	DownloadedAt time.Time `json:"downloaded_at"`
}

type Share struct {
	ID                int                 `json:"id"`
	Token             string              `json:"token"`
	FilePaths         []string            `json:"file_paths"`
	Label             string              `json:"label"`
	PrimaryName       string              `json:"primary_name"`
	PublicDownloadURL string              `json:"public_download_url"`
	LocalDownloadURL  string              `json:"local_download_url"`
	IsInternet        bool                `json:"is_internet"`
	IsLAN             bool                `json:"is_lan"`
	FileCount         int                 `json:"file_count"`
	TotalSize         int64               `json:"total_size"`
	PasswordHash      string              `json:"password_hash"`
	Note              string              `json:"note"`
	Downloads         int                 `json:"downloads"`
	CreatedAt         time.Time           `json:"created_at"`
	ExpiresAt         *time.Time          `json:"expires_at"`
	IsActive          bool                `json:"is_active"`
	DownloadHistory   []DownloadHistoryItem `json:"download_history"`
}

type CreateResp struct {
	Token            string `json:"token"`
	DownloadURL      string `json:"download_url"`
	LocalDownloadURL string `json:"local_download_url"`
	ShareID          int    `json:"share_id"`
	PublicBaseURL    string `json:"public_base_url"`
	IsInternet       bool   `json:"is_internet"`
	IsLAN            bool   `json:"is_lan"`
	Note             string `json:"note,omitempty"`
}

type TransferStats struct {
	Token        string    `json:"token"`
	SessionID    string    `json:"session_id"`
	BytesWritten int64     `json:"bytes_written"`
	TotalBytes   int64     `json:"total_bytes"`
	Speed        float64   `json:"speed"` // bytes per second
	IsActive     bool      `json:"is_active"`
	StartTime    time.Time `json:"-"`
	LastUpdated  time.Time `json:"-"`
}

type Connection struct {
	SessionID    string
	Token        string
	IP           string
	BytesWritten int64
	Speed        float64
	StartTime    time.Time
	LastUpdated  time.Time
	Cancel       context.CancelFunc
	Cancelled    bool
}

type ProgressWriter struct {
	w         http.ResponseWriter
	token     string
	sessionID string
	lastTime  time.Time
	lastBytes int64
}

type PageData struct {
	Label              string
	FileCount          int
	TotalSizeFormatted string
	Note               string
	Error              string
}
