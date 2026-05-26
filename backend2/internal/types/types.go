package types

import "time"

type Share struct {
	ID               int       `json:"id"`
	Token            string    `json:"token"`
	FilePaths        []string  `json:"file_paths"`
	CreatedAt        time.Time `json:"created_at"`
	Label            string    `json:"label"`
	DownloadURL      string    `json:"download_url"`
	FileCount        int       `json:"file_count"`
	TotalSize        int64     `json:"total_size"`
	PrimaryName      string    `json:"primary_name"`
	RecipientSummary string    `json:"recipient_summary"`
}

type CreateResp struct {
	Token         string `json:"token"`
	DownloadURL   string `json:"download_url"`
	ShareID       int    `json:"share_id"`
	PublicBaseURL string `json:"public_base_url"`
}

type TransferStats struct {
	Token        string    `json:"token"`
	BytesWritten int64     `json:"bytes_written"`
	TotalBytes   int64     `json:"total_bytes"`
	Speed        float64   `json:"speed"` // bytes per second
	IsActive     bool      `json:"is_active"`
	StartTime    time.Time `json:"-"`
	LastUpdated  time.Time `json:"-"`
}
