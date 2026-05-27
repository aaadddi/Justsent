package share

import (
	"backend-app/internal/types"
	"crypto/rand"
	"encoding/hex"
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
		delete(shares, token)
		return true
	}
	return false
}
