package share

import (
	"backend-app/internal/db"
	"backend-app/internal/types"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"
)

var (
	shares            = map[string]types.Share{}
	nextID            = 1
	mu                sync.RWMutex
	TunnelURL         string
	BlockedIPs        = map[string]bool{} // key: token + "_" + ip
	TransfersMu       sync.RWMutex
	ActiveConnections = map[string]*types.Connection{}
	CumulativeBytes   = map[string]int64{} // key: token + "_" + ip
)

type FailedAttempt struct {
	Count        int
	BlockedUntil time.Time
	LastAttempt  time.Time
}

var (
	FailedAttempts   = map[string]*FailedAttempt{}
	FailedAttemptsMu sync.Mutex
)

func IsBlocked(token string, ip string) bool {
	key := token + "_" + ip

	FailedAttemptsMu.Lock()
	defer FailedAttemptsMu.Unlock()

	attempt, exists := FailedAttempts[key]

	if !exists {
		return false
	}

	// Block expired
	if time.Now().After(attempt.BlockedUntil) {
		delete(FailedAttempts, key)
		return false
	}

	return attempt.BlockedUntil.After(time.Now())
}

func RegisterFailedAttempt(token string, ip string) {
	key := token + "_" + ip

	FailedAttemptsMu.Lock()
	defer FailedAttemptsMu.Unlock()

	attempt, exists := FailedAttempts[key]

	if !exists {
		FailedAttempts[key] = &FailedAttempt{
			Count:       1,
			LastAttempt: time.Now(),
		}
		return
	}

	attempt.Count++
	attempt.LastAttempt = time.Now()

	// Block after 3 failures (as requested by user)
	if attempt.Count >= 3 {
		attempt.BlockedUntil = time.Now().Add(5 * time.Minute)
	}
}

func ClearFailedAttempts(token string, ip string) {
	key := token + "_" + ip

	FailedAttemptsMu.Lock()
	defer FailedAttemptsMu.Unlock()

	delete(FailedAttempts, key)
}

func generateToken() string {
	bytes := make([]byte, 16)
	_, err := rand.Read(bytes)
	if err != nil {
		panic(err)
	}
	return hex.EncodeToString(bytes)
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func Load() error {
	mu.Lock()
	defer mu.Unlock()

	rows, err := db.DB.Query(`
		SELECT id, token, file_paths, label, primary_name, public_download_url, local_download_url,
		       is_internet, is_lan, file_count, total_size, password_hash, note, downloads, created_at, expires_at
		FROM shares
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	var maxID int
	for rows.Next() {
		var s types.Share
		var pathsJSON string
		var isInternetVal, isLANVal int
		var expiresAtVal *time.Time

		err := rows.Scan(
			&s.ID, &s.Token, &pathsJSON, &s.Label, &s.PrimaryName,
			&s.PublicDownloadURL, &s.LocalDownloadURL,
			&isInternetVal, &isLANVal, &s.FileCount, &s.TotalSize,
			&s.PasswordHash, &s.Note, &s.Downloads, &s.CreatedAt, &expiresAtVal,
		)
		if err != nil {
			return err
		}

		s.IsInternet = isInternetVal == 1
		s.IsLAN = isLANVal == 1
		s.ExpiresAt = expiresAtVal

		if err := json.Unmarshal([]byte(pathsJSON), &s.FilePaths); err != nil {
			s.FilePaths = []string{pathsJSON}
		}

		shares[s.Token] = s
		if s.ID > maxID {
			maxID = s.ID
		}
	}

	nextID = maxID + 1
	return nil
}

func Create(paths []string, label string, publicBaseURL string, localBaseURL string, password string, note string, isInternet bool, isLAN bool) (types.Share, error) {
	mu.Lock()
	defer mu.Unlock()

	var totalSize int64
	var primaryName string

	for i, path := range paths {
		info, err := os.Stat(path)
		if err != nil {
			return types.Share{}, fmt.Errorf("file not found: %s", path)
		}
		totalSize += info.Size()
		if i == 0 {
			primaryName = info.Name()
		}
	}

	if label == "" {
		if len(paths) > 0 {
			label = primaryName
		} else {
			label = "Share"
		}
	}

	token := generateToken()
	id := nextID
	nextID++

	s := types.Share{
		ID:                id,
		Token:             token,
		FilePaths:         paths,
		CreatedAt:         time.Now(),
		Label:             label,
		PublicDownloadURL: fmt.Sprintf("%s/share/%s", publicBaseURL, token),
		LocalDownloadURL:  fmt.Sprintf("%s/share/%s", localBaseURL, token),
		IsInternet:        isInternet,
		IsLAN:             isLAN,
		FileCount:         len(paths),
		TotalSize:         totalSize,
		PrimaryName:       primaryName,
		PasswordHash:      password,
		Note:              note,
	}

	// Persist to database
	pathsBytes, err := json.Marshal(paths)
	if err != nil {
		return types.Share{}, fmt.Errorf("failed to marshal file paths: %w", err)
	}

	_, err = db.DB.Exec(`
		INSERT INTO shares (id, token, file_paths, label, primary_name, public_download_url, local_download_url,
		                    is_internet, is_lan, file_count, total_size, password_hash, note, downloads, created_at, expires_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, s.ID, s.Token, string(pathsBytes), s.Label, s.PrimaryName, s.PublicDownloadURL, s.LocalDownloadURL,
		boolToInt(s.IsInternet), boolToInt(s.IsLAN), s.FileCount, s.TotalSize, s.PasswordHash, s.Note, s.Downloads, s.CreatedAt, s.ExpiresAt)
	if err != nil {
		return types.Share{}, fmt.Errorf("failed to persist share to database: %w", err)
	}

	shares[token] = s
	return s, nil
}

func Get(token string) (types.Share, bool) {
	mu.RLock()
	defer mu.RUnlock()
	s, exists := shares[token]
	return s, exists
}

func List() []types.Share {
	mu.RLock()
	defer mu.RUnlock()
	list := make([]types.Share, 0, len(shares))
	for _, s := range shares {
		list = append(list, s)
	}
	return list
}

func Delete(token string) bool {
	mu.Lock()
	defer mu.Unlock()
	_, exists := shares[token]
	if exists {
		_, err := db.DB.Exec("DELETE FROM shares WHERE token = ?", token)
		if err != nil {
			fmt.Printf("Error deleting share %s from database: %v\n", token, err)
		}
		delete(shares, token)
		return true
	}
	return false
}
